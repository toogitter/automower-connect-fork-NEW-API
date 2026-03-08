import EventEmitter from 'events';
import Moment from 'moment';
import { API_BASE } from './config.js';
import { ApiOutput, AutoConnectApiError } from './AutoMowerConnection.js';
import { MowerMode, MowerState, MowerActivity, AutoMowerCommand, RestrictedReason, OverrideAction } from './Enums.js';
// V2 Event type enum
export var WsEventTypeV2;
(function (WsEventTypeV2) {
    WsEventTypeV2["BATTERY"] = "battery-event-v2";
    WsEventTypeV2["MOWER"] = "mower-event-v2";
    WsEventTypeV2["PLANNER"] = "planner-event-v2";
    WsEventTypeV2["POSITION"] = "position-event-v2";
    WsEventTypeV2["CALENDAR"] = "calendar-event-v2";
    WsEventTypeV2["CUTTING_HEIGHT"] = "cuttingHeight-event-v2";
    WsEventTypeV2["HEADLIGHTS"] = "headlights-event-v2";
    WsEventTypeV2["MESSAGES"] = "message-event-v2";
})(WsEventTypeV2 || (WsEventTypeV2 = {}));
export class AutoMower extends EventEmitter {
    connection;
    id;
    data;
    lastErrorCode;
    batteryPercent;
    mode;
    activity;
    state;
    errorCode;
    errorCodeTimestamp;
    nextStartTimestamp;
    overrideAction;
    restrictedReason;
    isConnected;
    statusTimestamp;
    constructor(connection, id, data) {
        super();
        this.connection = connection;
        this.id = id;
        this.processAttributes(data.attributes);
        this.processStateEvent(data.attributes);
    }
    processAttributes(data) {
        this.data = data;
    }
    processWsAttributes(resultJson) {
        const updatedFields = [];
        if (resultJson.id == this.id) {
            switch (resultJson.type) {
                // ===== V1 legacy events (may still fire during transition) =====
                case "positions-event":
                    {
                        this.processPositionEvent(resultJson.attributes);
                        return ["positions"];
                    }
                case "status-event":
                    {
                        this.processStateEvent(resultJson.attributes);
                        break;
                    }
                case "settings-event":
                    {
                        break;
                    }
                // ===== V2 events =====
                case WsEventTypeV2.BATTERY:
                    {
                        const attrs = resultJson.attributes;
                        this.processBatteryEventV2(attrs);
                        updatedFields.push("batteryPercent");
                        break;
                    }
                case WsEventTypeV2.MOWER:
                    {
                        const attrs = resultJson.attributes;
                        this.processMowerEventV2(attrs);
                        updatedFields.push("mode", "activity", "state", "errorCode");
                        break;
                    }
                case WsEventTypeV2.PLANNER:
                    {
                        const attrs = resultJson.attributes;
                        this.processPlannerEventV2(attrs);
                        updatedFields.push("nextStartTimestamp", "overrideAction", "restrictedReason");
                        break;
                    }
                case WsEventTypeV2.POSITION:
                    {
                        const attrs = resultJson.attributes;
                        this.processPositionEventV2(attrs);
                        return ["positions"];
                    }
                case WsEventTypeV2.CALENDAR:
                    {
                        // Calendar updates: update the calendar tasks in data
                        if (resultJson.attributes?.calendar?.tasks) {
                            this.data.calendar.tasks = resultJson.attributes.calendar.tasks;
                            updatedFields.push("calendar");
                        }
                        break;
                    }
                case WsEventTypeV2.CUTTING_HEIGHT:
                    {
                        if (resultJson.attributes?.cuttingHeight?.height != null) {
                            this.data.settings.cuttingHeights = resultJson.attributes.cuttingHeight.height;
                            updatedFields.push("cuttingHeight");
                        }
                        break;
                    }
                case WsEventTypeV2.HEADLIGHTS:
                    {
                        if (resultJson.attributes?.headlights?.mode) {
                            this.data.settings.headlight.mode = resultJson.attributes.headlights.mode;
                            updatedFields.push("headlightMode");
                        }
                        break;
                    }
                case WsEventTypeV2.MESSAGES:
                    {
                        updatedFields.push("message");
                        break;
                    }
                default:
                    {
                        break;
                    }
            }
        }
        return updatedFields;
    }
    processStateEvent(stateJson) {
        const updatedFields = [];
        let newBatteryPercent = +stateJson.battery.batteryPercent;
        if (this.batteryPercent != newBatteryPercent) {
            this.data.battery.batteryPercent = newBatteryPercent;
            this.batteryPercent = newBatteryPercent;
            updatedFields.push("batteryPercent");
        }
        let newMode = MowerMode[stateJson.mower.mode];
        if (this.mode != newMode) {
            this.data.mower.mode = newMode;
            this.mode = newMode;
            updatedFields.push("mode");
        }
        let newActivity = MowerActivity[stateJson.mower.activity];
        if (this.activity != newActivity) {
            this.data.mower.activity = newActivity;
            this.activity = newActivity;
            updatedFields.push("activity");
        }
        let newState = MowerState[stateJson.mower.state];
        if (this.state != newState) {
            this.data.mower.state = newState;
            this.state = newState;
            updatedFields.push("state");
        }
        let newErrorCode = +stateJson.mower.errorCode;
        if (this.errorCode != newErrorCode) {
            this.data.mower.errorCode = newErrorCode;
            this.errorCode = newErrorCode;
            updatedFields.push("errorCode");
        }
        let newErrorCodeTimestamp = Moment(stateJson.mower.errorCodeTimestamp);
        if (this.errorCodeTimestamp != newErrorCodeTimestamp) {
            this.data.mower.errorCodeTimestamp = stateJson.mower.errorCodeTimestamp;
            this.errorCodeTimestamp = newErrorCodeTimestamp;
            updatedFields.push("errorCodeTimestamp");
        }
        let newNextStartTimestamp = Moment(stateJson.planner.nextStartTimestamp);
        if (this.nextStartTimestamp != newNextStartTimestamp) {
            this.data.planner.nextStartTimestamp = +stateJson.planner.nextStartTimestamp;
            this.nextStartTimestamp = newNextStartTimestamp;
            updatedFields.push("nextStartTimestamp");
        }
        let newAction = OverrideAction[stateJson.planner.override.action];
        if (this.overrideAction != newAction) {
            this.data.planner.override.action = newAction;
            this.overrideAction = newAction;
            updatedFields.push("overrideAction");
        }
        let newRestrictedReason = RestrictedReason[stateJson.planner.restrictedReason];
        if (this.restrictedReason != newRestrictedReason) {
            this.data.planner.restrictedReason = newRestrictedReason;
            this.restrictedReason = newRestrictedReason;
            updatedFields.push("restrictedReason");
        }
        let newConnected = stateJson.metadata.connected;
        if (this.isConnected != newConnected) {
            this.data.metadata.connected = newConnected;
            this.isConnected = newConnected;
            updatedFields.push("isConnected");
        }
        let newStatusTimestamp = Moment(stateJson.metadata.statusTimestamp);
        if (this.statusTimestamp != newStatusTimestamp) {
            this.data.metadata.statusTimestamp = stateJson.metadata.statusTimestamp;
            this.statusTimestamp = newStatusTimestamp;
            updatedFields.push("isConnected");
        }
        return updatedFields;
    }
    processPositionEvent(posJson) {
        const positionsJson = posJson.positions;
        this.data.positions = [];
        positionsJson.forEach((pos) => {
            this.data.positions.unshift(pos);
        });
        if (this.data.positions.length > 50) {
            this.data.positions.slice(49, this.data.positions.length - 1);
        }
    }
    // ===== V2 Event Handlers =====
    processBatteryEventV2(attrs) {
        if (attrs.battery && attrs.battery.batteryPercent != null) {
            const newBatteryPercent = +attrs.battery.batteryPercent;
            this.data.battery.batteryPercent = newBatteryPercent;
            this.batteryPercent = newBatteryPercent;
        }
    }
    processMowerEventV2(attrs) {
        if (!attrs.mower)
            return;
        const m = attrs.mower;
        if (m.mode != null) {
            const newMode = MowerMode[m.mode];
            if (newMode != null) {
                this.data.mower.mode = newMode;
                this.mode = newMode;
            }
        }
        if (m.activity != null) {
            const newActivity = MowerActivity[m.activity];
            if (newActivity != null) {
                this.data.mower.activity = newActivity;
                this.activity = newActivity;
            }
        }
        if (m.state != null) {
            const newState = MowerState[m.state];
            if (newState != null) {
                this.data.mower.state = newState;
                this.state = newState;
            }
        }
        if (m.errorCode != null) {
            const newErrorCode = +m.errorCode;
            this.data.mower.errorCode = newErrorCode;
            this.errorCode = newErrorCode;
        }
        if (m.errorCodeTimestamp != null) {
            this.data.mower.errorCodeTimestamp = m.errorCodeTimestamp;
            this.errorCodeTimestamp = Moment(m.errorCodeTimestamp);
        }
    }
    processPlannerEventV2(attrs) {
        if (!attrs.planner)
            return;
        const p = attrs.planner;
        if (p.nextStartTimestamp != null) {
            this.data.planner.nextStartTimestamp = +p.nextStartTimestamp;
            this.nextStartTimestamp = Moment(p.nextStartTimestamp);
        }
        if (p.override && p.override.action != null) {
            const newAction = OverrideAction[p.override.action];
            if (newAction != null) {
                this.data.planner.override.action = newAction;
                this.overrideAction = newAction;
            }
        }
        if (p.restrictedReason != null) {
            const newReason = RestrictedReason[p.restrictedReason];
            if (newReason != null) {
                this.data.planner.restrictedReason = newReason;
                this.restrictedReason = newReason;
            }
        }
    }
    processPositionEventV2(attrs) {
        // V2 sends single position objects, not arrays
        if (attrs.position) {
            // Prepend new position
            this.data.positions.unshift(attrs.position);
            // Keep max 50 positions
            if (this.data.positions.length > 50) {
                this.data.positions = this.data.positions.slice(0, 50);
            }
        }
    }
    onStartRealtimeUpdates(func) {
        return this.on('startWSUpdates', func);
    }
    onStopRealtimeUpdates(func) {
        return this.on('stopWSUpdates', func);
    }
    onUpdate(func) {
        return this.on('wsUpdate', func);
    }
    async pauseMower() {
        await this.command(AutoMowerCommand.Pause);
    }
    async parkUntilNextSchedule() {
        await this.command(AutoMowerCommand.ParkUntilNextSched);
    }
    async parkUntilFurtherNotice() {
        await this.command(AutoMowerCommand.ParkUntilFurtherNotice);
    }
    async parkForDurationOfTime(minutes) {
        await this.command(AutoMowerCommand.Park, minutes);
    }
    async resumeSchedule() {
        await this.command(AutoMowerCommand.ResumeSchedule);
    }
    async startMowing(minutes) {
        await this.command(AutoMowerCommand.Start, minutes);
    }
    async command(command, minutes, workAreaId) {
        try {
            const body = {
                data: {
                    type: command
                }
            };
            // Add minutes to body if provided
            if (minutes) {
                body.data.attributes = {
                    duration: minutes
                };
            }
            // Add work area id to body if provided
            if (workAreaId) {
                body.data.attributes.workAreaId = workAreaId;
            }
            // Request
            await this.connection.apiRequest(`${API_BASE}/mowers/${this.id}/actions`, null, 'POST', body, 202, ApiOutput.Text);
        }
        catch (e) {
            throw new AutoConnectApiError(`Couldn't execute action command` + e);
        }
    }
    get error() {
        // If currently in warning/error state, return the latest known error
        if ((this.data.mower.state == MowerState.ERROR || this.data.mower.state == MowerState.FATAL_ERROR) && this.lastErrorCode) {
            return this.lastErrorCode;
        }
        return null;
    }
}
//# sourceMappingURL=AutoMower.js.map