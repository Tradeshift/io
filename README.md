# `ts.app`

# AKA `Tradeshift App Messaging Protocol`

This is the standard way for apps on the Tradeshift Platform to

* communicate with the Chrome,
* communicate with other apps,
* open other apps in separate iframes and wait for the result of user interactions.

## API reference

### `ts.app.connect(clientIds)`

Connect to Server/Broker

`userId`, `companyId` and `appId` are already known by `Tradeshift.Chrome` AKA the Broker.

### `ts.app.listen(handler)`

Handle any messages sent to my `appId`

* `handler` (Function `ts.app.MessageHandler`, required)

Arguments passed to `handler`:

* `appId` (string, required): Incoming message sender
* `topic` (string, required): Incoming message topic
* `payload` (any, optional): Incoming message payload

### `ts.app.publish(message)`

Publish messages

* `message` (object `ts.app.Message`, required)
  * `appId` (string, required): Message recipient (wildcards NOT allowed)
  * `topic` (string, required): Message topic (wildcards NOT allowed)
  * `payload` (any, optional): Message payload

### `ts.app.subscribe(subscriptions)`

Subscribe to appIds and/or topics

* `subscriptions` (`Array<ts.app.Subscription>`, required)
  * `appId` (string, optional if `topic` is defined): AppId to subscribe to (wildcards allowed)
  * `topic` (string, optional if `appId` is defined): Topic to subscribe to (wildcards allowed)
  * `handler` (function, required): Handle incoming messages for subscription, see `ts.app.listen` & `ts.app.MessageHandler`

### `ts.app.unsubscribe(unsubscriptions)`

Unsubscribe from appIds and/or topics

> Wildcards are only used to match to the exact subscriptions the Client has.

> If `handler` is supplied, unsubscription only succeeds if it matches the currently subscribed `handler`

* `unsubscriptions` (`Array<ts.app.Subscription>`, required)
  * `appId` (string, optional if `topic` is defined): AppId to unsubscribe from (wildcards allowed)
  * `topic` (string, optional if `appId` is defined): Topic to unsubscribe from (wildcards allowed)
  * `handler` (function, optional): Handler to deregister

### `ts.app.exchange(messages)`

Exchange message with specific apps

* `messages` (`Array<ts.app.Message>`, required)
  * `appId` (string, required): Message recipient (wildcards NOT allowed)
  * `topic` (string, required): Message topic (wildcards NOT allowed)
  * `payload` (any, optional): Message payload

### `ts.app.load(message)`

Load specific app, wait for and handle user interaction

* `message` (`ts.app.Message`, required)
  * `appId` (string, required): Message recipient (wildcards NOT allowed)
  * `topic` (string, required): Message topic (wildcards NOT allowed)
  * `payload` (any, optional): Message payload

## API use-cases

Examples listed:

* [Send message to a single app](#send-message-to-a-single-app)
* [Send message to multiple apps](#send-message-to-multiple-apps)
* [Receive message from any app](#receive-message-from-any-app)
* [Receive message from specific apps and/or topics](#receive-message-from-specific-apps-andor-topics)
* [Receive message for specific topics](#receive-message-for-specific-topics)
* [Receive message from any app and respond back (with error handling)](#receive-message-from-any-app-and-respond-back-with-error-handling)
* [Send message to single app and handle response](#send-message-to-single-app-and-handle-response)
* [Send message to multiple apps and handle response(s)](#send-message-to-multiple-apps-and-handle-responses)
* [Load app and handle response](#load-app-and-handle-response)

### Send message to a single app

```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Tell Tradeshift.RaptorFactory to unleash 300 raptors
    client.publish({
      appId: 'Tradeshift.RaptorFactory',
      topic: 'unleash/raptors',
      payload: 300
    });
  } catch (e) {
    console.error(e);
  }
}
init();
```

### Send message to multiple apps

```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Tell every Tradeshift app to unleash 500 godzillas
    client.publish({
      appId: 'Tradeshift.+',
      topic: 'unleash/godzilla',
      payload: 500
    });
  } catch (e) {
    console.error(e);
  }
}
init();
```

### Receive message from any app

```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Handle messages directed at my appId
    client.listen((appId, topic, payload) => {
      switch (topic) {
        case 'unleash/raptors':
          console.log(
            `${appId} sent the order: Time to unleash ${payload} raptors!`
          );
          break;
      }
    });
  } catch (e) {
    console.error(e);
  }
}
init();
```

### Receive message from specific apps and/or topics

```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Subscribe to specific apps
    client.subscribe([
      {
        appId: 'Tradeshift.+', // /^Tradeshift.[0-9a-zA-Z_-]$/
        topic: '+/godzilla', // /^[0-9a-zA-Z_- ]*\/godzilla$/
        handler
      },
      {
        appId: 'Tradeshift.WizardSchool',
        topic: 'magic/#', // /^magic\/(.*)$/
        handler
      },
      {
        appId: 'Tradeshift.Magicians'
        handler
      }
    ]);
  } catch (e) {
    console.error(e);
  }
}
init();

// Simple message handler
function handler(appId, topic, payload) {
  console.log(`Message from app: ${appId}`);
  console.log(`Topic: ${topic}`);
  console.log(`Payload: ${payload}`);
}
```

### Receive message for specific topics

```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Subscribe to specific topics
    client.subscribe([
      {
        topic: '+/spells', // /^[0-9a-zA-Z_- ]*\/spells$/
        handler
      },
      {
        topic: '#/set/#', // /^(.*)\/set\/(.*)$/
        handler
      },
      {
        topic: 'wand/carving',
        handler
      }
    ]);
  } catch (e) {
    console.error(e);
  }
}
init();

// Simple message handler
function handler(appId, topic, payload) {
  console.log(`Message from app: ${appId}`);
  console.log(`Topic: ${topic}`);
  console.log(`Payload: ${payload}`);
}
```

### Receive message from any app and respond back (with error handling)

```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Handle messages directed at my appId
    client.listen((appId, topic, payload) => {
      switch (topic) {
        case 'cast/magic-missile':
          if (payload.level < 1) {
            return client.publish({
              appId,
              topic,
              payload: {
                err: 'Magic Missile has to be 1st-level or higher!'
              }
            });
          }
          // Respond back to the sender app with the same topic
          const numMissiles = payload.level + 3;
          return client.publish({
            appId,
            topic,
            payload: {
              numMissiles,
              dmg: numMissiles * (rollDice(4) + 1)
            }
          });
      }
    });
  } catch (e) {
    console.error(e);
  }
}
init();

function rollDice(sides) {
  return Math.floor(Math.random() * 4) + 1;
}
```

### Send message to single app and handle response

```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Exchange message with specific app
    const spellCasterResponse = await client.exchange([
      {
        appId: 'Tradeshift.SpellCaster',
        topic: 'cast/magic-missile',
        payload: {
          level: 3
        }
      }
    ]);

    // Handle response
    if (spellCasterResponse.err) {
      console.error('Something went wrong while casting Magic Missile!');
      console.error(spellCasterResponse.err);
    } else {
      console.log(
        `Magic Missile dealt ${spellCasterResponse.dmg} points of force damage.`
      );
    }
  } catch (e) {
    console.error(e);
  }
}
init();
```

### Send message to multiple apps and handle response(s)

```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Exchange message with multiple apps
    const [jazzResponse, lightsResponse] = await client.exchange([
      {
        appId: 'Tradeshift.Jazz',
        topic: 'music/play',
        payload: {
          smoothness: 8
        }
      },
      {
        appId: 'Tradeshift.Lights',
        topic: 'scene/set',
        payload: {
          relaxing: 42
        }
      }
    ]);

    // Handle responses
    console.log(
      `Playing ${jazzResponse.track} while setting ${
        lightsResponse.lights
      } lights to ${lightsResponse.color}`
    );
  } catch (e) {
    console.error(e);
  }
}
init();
```

### Load explicit app and handle response

```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Load app and wait for user selection or some other response
    const shipSelectorResult = await client.load({
      appId: 'Tradeshift.ShipSelector',
      topic: 'ship/select',
      payload: {
        minCapacity: 500,
        minSpeed: 30
      }
    });

    // Handle response
    console.log(
      `Selected ship: ${shipSelectorResult.name}, capacity: ${
        shipSelectorResult.capacity
      }, speed: ${shipSelectorResult.speed}`
    );
  } catch (e) {
    console.error(e);
  }
}
init();
```


### Load implicit app and handle response

#### Possible list of Identifiers

This is very WIP, suggestions are welcome on how we should keep this list organized and maintained.

* `tradeshift:user`
* `tradeshift:tax`
* `tradeshift:document`
* `tradeshift:document:invoice`


```js
import tsApp from '@tradeshift/tradeshift-app';

async function init() {
  try {
    // Connect to Server
    const client = await tsApp.connect();

    // Load app and wait for user selection or some other response
    const shipSelectorResult = await client.load({
      // We specify some thing by its identifier, that we want to handle
      intent: 'tradeshift:ship:space',
      // We specify the action we want to do with the thing
      // @TODO why wouldn't we just call this `action`? Are there other use-cases?
      topic: 'select',
      payload: {
        minCapacity: 500,
        minSpeed: 30
      }
    });

    // Handle response
    console.log(
      `Selected ship: ${shipSelectorResult.name}, capacity: ${
        shipSelectorResult.capacity
      }, speed: ${shipSelectorResult.speed}`
    );
  } catch (e) {
    console.error(e);
  }
}
init();
```
