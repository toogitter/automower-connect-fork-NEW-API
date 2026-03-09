# Automower-Connect

[![npm](https://badgen.net/npm/v/automower-connect)](https://www.npmjs.com/package/automower-connect)

FORK of https://github.com/jochamsa/automower-connect with NEW API implementation!

A nodejs package which allows communicating with the Automower Connect API.

## Install

`npm i --save automower-connect`

## Basic static example
Get a list of all mowers including a snapshot of their state.
Note: Make sure you don't do this too often because these calls are rate limited.

```javascript
import AutoMowerConnection from 'automower-connect';

const automower = new AutoMowerConnection({ apiKey: 'YOUR_APP_KEY', clientSecret:'YOUR_APP_SECRET' });
const mowers = await automower.getMowers();
```

## Realtime status of mowers
```javascript
import AutoMowerConnection from 'automower-connect';

const automower = new AutoMowerConnection({ apiKey: 'YOUR_APP_KEY', clientSecret:'YOUR_APP_SECRET' });
const mowers = await automower.getMowers();
const mower = mowers[0];

mower.onStartRealtimeUpdates(()=> {
    console.log(`Websocket opened listening for updates for this device.`);
});

mower.onUpdate((updatedFields)=> {
    console.log(`Received updates for these fields on this device: ${updatedFields}`);
});

await mower.activateRealtimeUpdates();
```

## Commanding a device
```javascript
import AutoMowerConnection from 'automower-connect';

const automower = new AutoMowerConnection({ apiKey: 'YOUR_APP_KEY', clientSecret:'YOUR_APP_SECRET' });
const mowers = await automower.getMowers();
const mower = mowers[0];

await mower.pauseMower();
await mower.parkUntilFurtherNotice();
await mower.parkUntilNextSchedule();
await.mower.parkForDurationOfTime(30); // 30 minutes
await mower.resumeSchedule();
await mower.startMowing(60); // 60 minutes
```
