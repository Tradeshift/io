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
- Any messages sent by an App (Client) are sent to `window.top` where the Hub (The Broker) runs.
- Any messages received by an App (Client) are sent from `window.top` through the Hub (The Broker).
- The Tradeshift® Chrome™ keeps track of all apps and decides which ones have access to which ones.
  - Spawned iframes can only communicate with their spawner and their own spawnees and `Tradeshift.Chrome`.

## `ts.io` API reference (quick overview)

### In the frame/window of Tradeshift® Apps™

```js
import io from '@tradeshift/io';

// Create the App and connect to the Hub .......................................
const app = io();

/*
 * IMPORTANT!
 * You can register as many handlers as you'd like,
 * but if multiples match the same topic,
 * they all will be called, in the order they were registered.
 */

// Listen to all messages sent to my App .......................................
app.on('*', message => {});

// Listen to messages for a specific topic (sent to my App) ....................
const myListener = message => {};
const myTopic = 'my-topic';
const unlisten = app.on(myTopic, myListener);
// Stop listening
unlisten();
// OR
app.off(myTopic, myListener); // nice to have

// This listener will only be called once
app.once(myTopic, myListener); // nice to have

// Send messages to other Apps .................................................
app.emit(topic, app, data);
app.emit('fly-high', 'Tradeshift.FlamingSkull', { flameColor: 'red' });

// Spawn an App ................................................................
(async () => {
  // Set up listeners for messages from the spawned App while it's running
  const unspawnscribe = app.on('mid-spawn-topic-*', message => {});
  // Do the actual spawn call
  const [err, data] = await app.call('spawn', target, data);
  // Stop listening to mid-spawn messages
  unspawnscribe();
  // Handle the results
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

// Handle the spawn call .......................................................
app.add('spawn', (data, submit, parent) => {
  // CODE HERE: Animate opening your UI and wait for user input.

  // Send messages your spawner App ..........................................
  app.emit(topic, parent, data);

  // CODE HERE: Animate closing your UI.

  // Send message back to parent .............................................
  submit(userData);

  // Your app will be killed and its iframe destroyed.
});
```

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
  }
});

// Handle when an App times out ................................................
// The App hasn't responded to PINGs within 3xHEARTBEAT (3x3333ms)
hub.add('timeout', (app, win) => {});

// Handle App spawn lifecycle ..................................................
hub.add('spawn', (app, parentApp) => {});
hub.add('spawn.submit', (app, parentApp, data) => {});
hub.add('spawn.timeout', (app, parentApp) => {});

// Terminate App Instance in target Window .....................................
hub.call('kill', win);

// Create App (a client) for the Tradeshift® Chrome™ and connect to Hub (The Broker)
const top = hub.top();
top.on('*', message => {
  // Handle messages sent to 'Tradeshift.Chrome'
});
```
