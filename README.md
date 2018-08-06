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
const io = require('@tradeshift/io');

// Create App (a client) and connect to Hub (The Broker) .......................
const app = io();

// Listen to incoming messages .................................................
/*
 * IMPORTANT!
 * You can register as many handlers as you'd like,
 * but if multiples match the same topic,
 * they all will be called, in the order they were created.
 */
let unregisterHandler = app.on(message => {
  //Handle messages sent to your app.
});
unregisterHandler(); // Unregister message handler

unregisterHandler = app.on(topicExpression, message => {
  // Handle messages matching topic expressions sent to your app.
});
unregisterHandler();

// Publish a Message ...........................................................
app.publish(target, topic, data);

// Exchange a message ..........................................................
const [err, data] = app.request(target, topic, data);
if (err) {
  if (err instanceof ts.io.Error) {
    // Something went horribly wrong
  } else {
    // Failure response from target app
  }
}
doSomethingWith(data); // Success response from target app

// Load app and wait for user input ............................................
const [err, data] = await app.spawn(target, topic, data);
if (err) {
  if (err instanceof ts.io.Error) {
    // Something went horribly wrong
  } else {
    // Failure response from target app
  }
}
doSomethingWith(data); // Success response from target app
```

### In the frame/window of Tradeshift® Apps™ spawned or opened by another Tradeshift® App™

```js
const io = require('@tradeshift/io');
// Create App (a client) and connect to Hub (The Broker) .......................
const app = io();

// Listen to incoming messages .................................................
app.onspawn((msg, resolve, reject) => {
  // Do stuff here to open the panel with some fancy animation
  // ...
  // Wait for user input
  // ...
  // Close the panel with fancy animations here
  //
  if (userInput.is('good')) {
    resolve(userInput); // Resolve the promise on the spawner side
  } else {
    reject(userInput); // Reject the promise on the spawner side
  }
});
```

### In the frame/window of the Tradeshift® Chrome™

```js
const io = require('@tradeshift/io');

// Create Hub (The Broker) .....................................................
const hub = io({
  appIdByWindow: win => {
    // Return appId based on a Window object.
    // Used for identifying new Apps (clients).
  },
  windowByAppId: (appId, sourceWindow) => {
    // Return window object based on an appId string.
    // Used for identifying where to relay messages.
  },
  appTimeout: (targetWindow, appId) => {
    // This is called by the Hub when an app times out.
  },
  // These handlers are called whenever an app tries to
  // spawn/request/open another app.
  onspawn: spawnMessage => {},
  onrequest: requestMessage => {}
});

// Create App (a client) for the Tradeshift® Chrome™ and connect to Hub (The Broker)
const top = hub.top();
top.on(message => {
  // Handle messages sent to 'Tradeshift.Chrome'
});
```
