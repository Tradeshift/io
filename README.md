[![travis](https://travis-ci.org/Tradeshift/io.svg?branch=master)](https://travis-ci.org/Tradeshift/io) [![npm](https://img.shields.io/npm/v/@tradeshift/io.svg)](https://npmjs.org/package/@tradeshift/io) [![Greenkeeper badge](https://badges.greenkeeper.io/Tradeshift/io.svg)](https://greenkeeper.io/)

# `ts.io`

## Tradeshift App Messaging Library

This is the standard way for apps on the client-side of the Tradeshift Platform to

- communicate with the Tradeshift® Chrome™,
- communicate with other apps,
- open other apps in separate iframes/popups and wait for the result of user interactions.

### Why?

- allow third-party app developers to utilize first-party app panels & modals all across the Tradeshift Web UI,
- allow first-party legacy apps to utilize first-party app panels & modals all across the Tradeshift Web UI,
- allow pinning `ts.ui` versions for specific legacy apps within the Tradeshift Platform to facilitate easy upgrades,
- have a generic, controlled and secure way of communicating between apps, regardless of iframe sandboxing or cross-domain requests.

### Limitations

- There can be only one App (Client) in a single `Window` context (iframe/popup).
- Any postMessages sent by an App (Client) are sent to `window.top` where the Hub (The Broker) runs.
- Any postMessages received by an App (Client) are sent from `window.top` through the Hub (The Broker).
- The Tradeshift® Chrome™ keeps track of all apps and decides which ones have access to which ones.
  - Spawned iframes can only communicate with their spawner and their own spawnees and `Tradeshift.Chrome`.

## Installation

```
npm install @tradeshift/io
```

## Usage

```js
import io from '@tradeshift/io';

// Create the App and connect to the Hub
const app = io();

// Spawn an App:
(async () => {
	// Do the actual spawn call
	const [err, data] = await app.spawn(targetApp, targetData);

	if (err) {
		// Something went horribly wrong while spawning app
	} else {
		doSomethingWith(data);
	}
})();

// Allow your app to be spawned by others:
app.define({
	async spawn(data) {
		// Wait for user input here...
		const userData = await myPrompt();

		// Send response back to parent
		return userData;
	}
});
```

## `ts.io` API reference (quick overview)

### Spawning another app

```js
import io from '@tradeshift/io';
const app = io();

const [err, data] = await app.spawn(targetApp, targetData);
```

### Defining app lifecycle when others spawn your app

To handle the request from other apps, an app needs to define a spawn handler. The recommended API uses promises to allow an `async/await` style handler, and makes it possible to do a series of async transitions before returning the value to the parent app.

```js
import io from '@tradeshift/io';
const app = io();

app.define({
	async spawn(data) {
		// CODE HERE: Animate opening your UI and wait for user input.

		// Wait for user input here...
		const userData = await myPrompt();

		// CODE HERE: Animate closing your UI.

		// Send response back to parent
		return userData;
	}
});
```

Callback based Spawn handler if you prefer:

```js
app.define({
	spawn(data, submit, parent) {
		// Send response back to parent
		submit(userData);
	}
});
```

### Talking to other apps w/ events

```js
import io from '@tradeshift/io';
const app = io();

// Events
/*
 * IMPORTANT!
 * You can register as many handlers as you'd like,
 * but if multiples match the same topic,
 * they all will be called, in the order they were registered.
 */

// Listen to all events sent to my App
app.on('*', event => {});

// Listen to events for a specific topic (sent to my App)
const myListener = event => {};
const myTopic = 'my-topic';
const unlisten = app.on(myTopic, myListener);
// Stop listening
unlisten();
// OR
app.off(myTopic, myListener); // nice to have

// This listener will only be called once
app.once(myTopic, myListener); // nice to have

// Send events to other Apps
// app.emit(topic[, data], app);
app.emit('fly-high', { flameColor: 'red' }, 'Tradeshift.FlamingSkull');
```

### Experimental request API

```js
(async () => {
	const [err, response] = await app1.emit('topic-with-request', 'App2', data);
	if (err) {
		// Something went horribly wrong while emitting
	} else {
		doSomethingWith(response);
	}
})();
app1.emit('topic-with-request', 'App2', data);
app1.emit('topic-without-request', 'App2', data);

app2.on('topic-with-request', event => {
	return 'my-response';
});

app2.on('topic-without-request', event => {});
```

<!--
# WARNING

# DO NOT READ BELOW THIS LINE

## YOU WILL BE CONFUSED

### IT DOES NOT CONCERN YOU

### In the frame/window of the Tradeshift® Chrome™

```js
import io from '@tradeshift/io';

// Create The Hub
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

// Terminate App Instance in target Window
hub.forgetApp(win);

// Create App (a client) for the Tradeshift® Chrome™ and connect to Hub (The Broker)
const top = hub.top();
top.on('*', event => {
  // Handle events sent to 'Tradeshift.Chrome'
});
```
-->
