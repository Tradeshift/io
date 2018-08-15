[![travis](https://travis-ci.org/Tradeshift/io.svg?branch=master)](https://travis-ci.org/Tradeshift/io) [![npm](https://img.shields.io/npm/v/@tradeshift/io.svg)](https://npmjs.org/package/@tradeshift/io) [![Greenkeeper badge](https://badges.greenkeeper.io/Tradeshift/io.svg)](https://greenkeeper.io/)

# `ts.io`

## Tradeshift App Messaging Library

This is the standard way for apps on the client-side of the Tradeshift Platform to

- communicate with the Tradeshift® Chrome™,
- communicate with other apps,
- open other apps in separate iframes/popups and wait for the result of user interactions.

## Why?

- allow third-party app developers to utilize first-party app panels & modals all across the Tradeshift Web UI,
- allow first-party legacy apps to utilize first-party app panels & modals all across the Tradeshift Web UI,
- allow pinning `ts.ui` versions for specific legacy apps within the Tradeshift Platform to facilitate easy upgrades,
- have a generic, controlled and secure way of communicating between apps, regardless of iframe sandboxing or cross-domain requests.

## Rules

- There can be only one App (Client) in a single `Window` context (iframe/popup).
- Any postMessages sent by an App (Client) are sent to `window.top` where the Hub (The Broker) runs.
- Any postMessages received by an App (Client) are sent from `window.top` through the Hub (The Broker).
- The Tradeshift® Chrome™ keeps track of all apps and decides which ones have access to which ones.
  - Spawned iframes can only communicate with their spawner and their own spawnees and `Tradeshift.Chrome`.

## `ts.io` API reference (quick overview)

### In the frame/window of Tradeshift® Apps™

```js
import io from '@tradeshift/io';

// Create the App and connect to the Hub .......................................
const app = io();

// Events ......................................................................
/*
 * IMPORTANT!
 * You can register as many handlers as you'd like,
 * but if multiples match the same topic,
 * they all will be called, in the order they were registered.
 */

// Listen to all events sent to my App .......................................
app.on('*', event => {});

// Listen to events for a specific topic (sent to my App) ....................
const myListener = event => {};
const myTopic = 'my-topic';
const unlisten = app.on(myTopic, myListener);
// Stop listening
unlisten();
// OR
app.off(myTopic, myListener); // nice to have

// This listener will only be called once
app.once(myTopic, myListener); // nice to have

// Send events to other Apps .................................................
// app.emit(topic[, data], app);
app.emit('fly-high', { flameColor: 'red' }, 'Tradeshift.FlamingSkull');

// Spawn an App ................................................................
(async () => {
  // Do the actual spawn call
  const [err, data] = await app.spawn(target, data);

  if (err) {
    // Something went horribly wrong while spawning app
  } else {
    doSomethingWith(data);
  }
})();
```

### In the frame/window of Tradeshift® Apps™ spawned by another App

```js
import io from '@tradeshift/io';

// Create the App and connect to the Hub .......................................
const app = io();

app.define({
  // We are being spawned ......................................................
  spawn(data, submit, parent) {
    // CODE HERE: Animate opening your UI and wait for user input.

    // Wait for user input here...

    // CODE HERE: Animate closing your UI.

    // Send response back to parent ...........................................
    submit(userData);

    // Your app will be killed and its iframe destroyed.
  }
});
```

### Experimental request API

```js
app1.emit('topic-with-request', 'App2', data).then(response => {
  /* I got the response! */
});
app1.emit('topic-with-request', 'App2', data);
app1.emit('topic-without-request', 'App2', data);

app2.on('topic-with-request', event => {
  return 'my-response';
});

app2.on('topic-without-request', event => {});
```

# WARNING

# DO NOT READ BELOW THIS LINE

## YOU WILL BE CONFUSED

### IT DOES NOT CONCERN YOU

### In the frame/window of the Tradeshift® Chrome™

```js
import io from '@tradeshift/io';

// Create The Hub ..............................................................
const hub = io({
  appByWindow(win) {
    return app;
  },
  windowByApp(app, sourceWindow) {
    return win;
  },
  handleAppTimeout(app, win) {},
  handleAppSpawn(app, parentApp) {},
  handleAppSubmit(app, parentApp, data) {}
});

// Terminate App Instance in target Window .....................................
hub.forgetApp(win);

// Create App (a client) for the Tradeshift® Chrome™ and connect to Hub (The Broker)
const top = hub.top();
top.on('*', event => {
  // Handle events sent to 'Tradeshift.Chrome'
});
```
