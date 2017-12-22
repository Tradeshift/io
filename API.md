## Table of Contents
* [API](#api)
  * [ts.app](#tsapp)
    * [ts.app.Message](#tsappmessage)
    * [ts.app.MessageHandler](#tsappmessagehandler)
    * [ts.app.Subscription](#tsappsubscription)
  * [ts.amp](#tsamp)
    * [ts.amp.Message](#tsampmessage)
    * [ts.amp.Connection](#tsampconnection)
    * [ts.amp.Client](#tsampclient)
    * [ts.amp.Server](#tsampserver)
* [Lifecycle Diagrams](#lifecycle)

# API

## `ts.app`
Public Tradeshift App Messaging Client
### `ts.app.connect([will])`
Connect to Server/Broker/Chrome
### `ts.app.disconnect()`
Disconnect from Server/Broker/Chrome
### `ts.app.listen()`
Listen to subscribed messages
### `ts.app.publish()`
Publish message
### `ts.app.subscribe()`
Subscribe to messages
### `ts.app.unsubscribe()`
Unsubscribe from messages
### `ts.app.exchange()`
Exchange messages
### `ts.app.load()`
Load app and wait for result

### `ts.app.Message`
A single message

* `appId`: `string`
* `topic`: `string`
* `payload`: `any serializable type`
* `qos`: `Number`
* `retain`: `boolean`

### `ts.app.MessageHandler`
Handler for `ts.app.Message`
* `Function(appId, topic, payload)`

### `ts.app.Subscription`
A single subscription

* `appId`: `string`
* `topic`: `string`
* `handler`: `ts.app.MessageHandler`

## `ts.amp`
Internal Tradeshift App Messaging Protocol Namespace

### `ts.amp.Message`
* `messageId`: `string`
* `dup`: `boolean`
* `qos`: `Number`
* `retain`: `boolean`
* `topic`: `string`

Format:
```OriginVendorId/OriginAppId/TargetVendorId/TargetAppId/rest/of/the/topic```

* `payload`: `any serializable type`

### `ts.amp.Message#toAppMessage`
Convert `ts.amp.Message` to `ts.app.Message`

### `ts.amp.Message#fromAppMessage`
Convert `ts.app.Message` to `ts.amp.Message`

### `ts.amp.Connection`
Tradeshift App Messaging Protocol Connection

#### `ts.amp.Connection#connect()`
#### `ts.amp.Connection#connack()`
#### `ts.amp.Connection#publish()`
#### `ts.amp.Connection#puback()`
#### `ts.amp.Connection#pubrec()`
#### `ts.amp.Connection#pubrel()`
#### `ts.amp.Connection#pubcomp()`
#### `ts.amp.Connection#subscribe()`
#### `ts.amp.Connection#suback()`
#### `ts.amp.Connection#unsubscribe()`
#### `ts.amp.Connection#unsuback()`
#### `ts.amp.Connection#pingreq()`
#### `ts.amp.Connection#pingresp()`
#### `ts.amp.Connection#disconnect()`
#### `ts.amp.Connection#on()`
##### Event: `connect`
##### Event: `connack`
##### Event: `publish`
##### Event: `puback`
##### Event: `pubrec`
##### Event: `pubrel`
##### Event: `pubcomp`
##### Event: `subscribe`
##### Event: `suback`
##### Event: `unsubscribe`
##### Event: `unsuback`
##### Event: `pingeq`
##### Event: `pingesp`
##### Event: `disconnect`

### `ts.amp.Client`
Internal Tradeshift App Messaging Protocol Client

#### `ts.amp.Client#connected`
Is the Client connected?
`boolean`
#### `ts.amp.Client#lastMessageId`
`messageId` of the last sent message
`string` UUID

#### `ts.amp.Client#publish(ts.app.Message)`
Publish message
#### `ts.amp.Client#subscribe(Array<ts.app.Subscription>)`
Subscribe to messages
#### `ts.amp.Client#unsubscribe(Array<ts.app.Subscription>)`
Unsubscribe from messages
#### `ts.amp.Client#disconnect([force])`
End connection
* `force`: `boolean` Don't wait for any ACK, just disconnect
#### `ts.amp.Client#on()`
Handle events
##### Event `connect`
Client connected
##### Event `close`
Connection closed
##### Event `error`
Connection error
##### Event `message`
Message received
##### Event `messagesend`
Any message sent (including system messages)
##### Event `messagereceive`
Any message received (including system messages)

### `ts.amp.Server`
Tradeshift App Messaging Protocol Server
#### `ts.amp.Server#publish(ts.amp.Message)`
#### `ts.amp.Server#subscribe(clientId, Array<ts.app.Subscription>)`
#### `ts.amp.Server#unsubscribe(clientId, Array<ts.app.Subscription>)`
#### `ts.amp.Server#on()`
@see `ts.amp.Connection`

# Lifecycle

![01 - Connecting.svg](./docs/diagrams/01%20-%20Connecting.svg)
![02 - Identifying Clients.svg](./docs/diagrams/02%20-%20Identifying%20Clients.svg)
![03 - Keeping Connection Alive.svg](./docs/diagrams/03%20-%20Keeping%20Connection%20Alive.svg)
![04 - Publishing.svg](./docs/diagrams/04%20-%20Publishing.svg)
![05 - Listening.svg](./docs/diagrams/05%20-%20Listening.svg)
![06 - Subscribing.svg](./docs/diagrams/06%20-%20Subscribing.svg)
![07 - Unsubscribing.svg](./docs/diagrams/07%20-%20Unsubscribing.svg)
![08 - Exchange.svg](./docs/diagrams/08%20-%20Exchange.svg)
![09 - Unexpected Disconnect.svg](./docs/diagrams/09%20-%20Unexpected%20Disconnect.svg)
![10 - Disconnecting.svg](./docs/diagrams/10%20-%20Disconnecting.svg)
