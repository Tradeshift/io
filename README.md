[![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url]

[travis-image]: https://travis-ci.org/Tradeshift/io.svg?branch=master
[travis-url]: https://travis-ci.org/Tradeshift/io
[npm-image]: https://img.shields.io/npm/v/@tradeshift/io.svg
[npm-url]: https://npmjs.org/package/@tradeshift/io

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
const ts = ts || {};
ts.io = require('@tradeshift/io');

// Create App (a client) and connect to Hub (The Broker)
const app = ts.io();

// Listen to incoming messages
/*
 * IMPORTANT!
 * You can register as many handlers as you'd like,
 * but if multiples match the same topic,
 * they all will be called in the order they were created.
 */
let unregisterHandler = app.on(message => {
  //Handle messages sent to your app.
});
unregisterHandler(); // Unregister message handler

unregisterHandler = app.on(topicExpression, message => {
  // Handle messages matching topic expressions sent to your app.
});
unregisterHandler();

// Publish a Message
app.publish(target, topic, data);

// Exchange a message
try {
  client
    .request(target, topic, data)
    .then(res => {}) // Success response from target app
    .catch(err => {}); // Failure response from target app
} catch (fatalErr) {
  // Something went horribly wrong
}

// Load app and wait for user input
try {
  client
    .spawn(target, data)
    .then(res => {}) // Success response from target app
    .catch(err => {}); // Failure response from target app
} catch (fatalErr) {
  // Something went horribly wrong
}

// This next API is under consideration, it might not be implemented.
// Load app and keep it open in the background (or could be in a SideBar or a floating window)
try {
  const openedApp = client.open(appId, data);
  openedApp.publish(topic, data);
  openedApp
    .request(topic, data)
    .then(res => {}) // Failure response from opened app
    .catch(err => {}) // Failure response from opened app
    .finally(() => {
      openedApp.close();
    });
} catch (fatalErr) {
  // Something went horribly wrong
}
```

### In the frame/window of Tradeshift® Apps™ spawned or opened by another Tradeshift® App™

```js
// Create App (a client) and connect to Hub (The Broker)
const spawnedClient = ts.io();
spawnedClient.on((msg, resolve, reject) => {
  // Listen to incoming messages
  if (msg.topic === ts.io.TOPIC_SPAWN) {
    // Do stuff here to open the panel with some fancy animation
    // ...
    // Wait for user input
    // ...
    if (userInput.is('good')) {
      resolve(userInput); // Resolve the promise on the spawner side
    } else {
      reject(userInput); // Reject the promise on the spawner side
    }
    // Either close the window automatically here
    // or...
  }
  if (msg.topic === ts.io.TOPIC_UNSPAWN) {
    // Wait for this message to close the window.
    /**
     * NOTE!
     * This usage of the API is unclear,
     * maybe we want to keep the window open
     * in case the spawning app validates the message
     * and tells the spawned app that it won't work?
     */
  }
});
```

### In the frame/window of the Tradeshift® Chrome™

```js
const ts = ts || {};
ts.io = require('@tradeshift/io');

// Create Hub (The Broker)
const hub = ts.io({
  appIdByWindow: win => {
    // Return appId based on a Window object.
    // Used for identifying new Apps (clients).
  },
  windowByAppId: (appId, sourceWindow) => {
    // Return window object based on an appId string.
    // Used for identifying where to relay messages.
  }
});

// Create App (a client) for the Tradeshift® Chrome™ and connect to Hub (The Broker)
const top = hub.top();
top.on(message => {
  // Handle messages sent to 'Tradeshift.Chrome'
});
```
