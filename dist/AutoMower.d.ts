import EventEmitter from 'events';
import Moment from 'moment';
import { AutoMowerConnection } from './AutoMowerConnection.js';
import { MowerMode, MowerState, MowerActivity, HusqvarnaMowerErrorCode as MowerErrorCode, RestrictedReason } from './Enums.js';
import { AutoMowerData, AutoMowerPosition } from './AutoMowerTypes.js';
export type AutoMowerApiData = {
    id: string;
    type: string;
    attributes: AutoMowerData;
};
export type AutoMowerWebSocketData = {
    id: string;
    type: string;
    attributes: any;
};
export type AutoMowerWebSocketPositionData = {
    positions: AutoMowerPosition[];
};
export type AutoMowerWebSocketStatusData = {
    battery: {
        batteryPercent: number;
    };
    mower: {
        mode: string;
        activity: string;
        state: string;
        errorCode: number;
        errorCodeTimestamp: number;
    };
    planner: {
        nextStartTimestamp: number;
        override: {
            action: string;
        };
        restrictedReason: string;
    };
    metadata: {
        connected: boolean;
        statusTimestamp: number;
    };
};
export type AutoMowerWsBatteryDataV2 = {
    battery: {
        batteryPercent: number;
    };
};
export type AutoMowerWsMowerDataV2 = {
    mower: {
        mode: string;
        activity: string;
        inactiveReason?: string;
        state: string;
        errorCode: number;
        isErrorConfirmable?: boolean;
        workAreaId?: string;
        errorCodeTimestamp: number;
    };
};
export type AutoMowerWsPlannerDataV2 = {
    planner: {
        nextStartTimestamp: number;
        override: {
            action: string;
        };
        restrictedReason: string;
        externalReason?: number;
    };
};
export type AutoMowerWsPositionDataV2 = {
    position: AutoMowerPosition;
};
export declare enum WsEventTypeV2 {
    BATTERY = "battery-event-v2",
    MOWER = "mower-event-v2",
    PLANNER = "planner-event-v2",
    POSITION = "position-event-v2",
    CALENDAR = "calendar-event-v2",
    CUTTING_HEIGHT = "cuttingHeight-event-v2",
    HEADLIGHTS = "headlights-event-v2",
    MESSAGES = "message-event-v2"
}
export declare class AutoMower extends EventEmitter {
    protected connection: AutoMowerConnection;
    readonly id: string;
    data: AutoMowerData;
    lastErrorCode: MowerErrorCode;
    batteryPercent: number;
    mode: MowerMode;
    activity: MowerActivity;
    state: MowerState;
    errorCode: number;
    errorCodeTimestamp: Moment.Moment;
    nextStartTimestamp: Moment.Moment;
    overrideAction: string;
    restrictedReason: RestrictedReason;
    isConnected: boolean;
    statusTimestamp: Moment.Moment;
    constructor(connection: AutoMowerConnection, id: string, data: AutoMowerApiData);
    processAttributes(data: AutoMowerData): void;
    processWsAttributes(resultJson: AutoMowerWebSocketData): string[];
    private processStateEvent;
    private processPositionEvent;
    private processBatteryEventV2;
    private processMowerEventV2;
    private processPlannerEventV2;
    private processPositionEventV2;
    onStartRealtimeUpdates(func: () => void): this;
    onStopRealtimeUpdates(func: () => void): this;
    onUpdate(func: (updatedValues: string[]) => void): this;
    pauseMower(): Promise<void>;
    parkUntilNextSchedule(): Promise<void>;
    parkUntilFurtherNotice(): Promise<void>;
    parkForDurationOfTime(minutes: number): Promise<void>;
    resumeSchedule(): Promise<void>;
    startMowing(minutes?: number): Promise<void>;
    private command;
    get error(): MowerErrorCode;
}
