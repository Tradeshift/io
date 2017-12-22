# `ts.app`

# AKA `Tradeshift App Messaging Protocol`

See [old WIP spec](https://github.com/Tradeshift/tradeshift-ui/issues/287)

New API - v2.0

Heavily influenced by

* [MQTT v3.1.1](http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html)

Somewhat influenced by

* [STOMP v1.2](https://stomp.github.io/stomp-specification-1.2.html)

## Terminology

### Connection

A construct provided by the Web Browser via postMessage, that is being used by `ts.app`.

* It connects the Client to the Server
* It provides means to send a serialized JSON message between the iframe of the Client to the top frame of the Server.

### App Message

The data carried by the `ts.app` protocol between apps on the Tradeshift Platform.

When App Messages are transported by `ts.app` they have an associated Quality of Service and a Topic Name.

### Client

An app on the Tradeshift Platform that uses `ts.app`. A Client always connects to the Server (Chrome) via `postMessage`. It can

* Publish App Messages that other Clients might be interested in.
* Subscribe to request App Messages that it is interested in receiving.
* Unsubscribe to remove a request for App Messages.
* Disconnect from the Server (Chrome)

### Server (Chrome)

The Server / top frame / Chrome acts as an intermediary between Clients which publish App Messages and Clients which have made Subscriptions. The server

* Accepts connections from Clients.
* Accepts App Messages published by the Clients.
* Processes Subscribe and Unsubscribe requests from Clients.
* Forwards Application Messages that match Client Subscriptions.

### Subscription

A Subscription comprises a Topic Filter and a maximum QoS. A Subscription is associated with a single Session. A Session can contain more than one Subscription. Each Subscription within a session has a different Topic Filter.

### Topic Name

The label attached to an Application Message which is matched against the Subscriptions known to the Server. The Server sends a copy of the Application Message to each Client that has a matching Subscription.

### Topic Filter

An expression contained in a Subscription, to indicate an interest in one or more topics. A Topic Filter can include wildcard characters.

### Session

A stateful interaction between a Client and the Server. Some Sessions last only as long as the Connection, other can span multiple consecutive Connections between a Client and the Server.

## `ts.app` Control Message

An object containing information that is sent across the Connection. The `ts.app` specification defines 14 different types of Control Messages, one of which (the PUBLISH object) is used to convey App Messages.

### Structure of a `ts.app` Control Message

The `ts.app` protocol works by exchanging a series of `ts.app` Control Messages in a defined way. This section describes the format of these objects.

A `ts.app` Control Message is in JSON format and consist of up to three parts, always in the following structure:

* Type (`cmd`) field, present in all `ts.app` Control Messages
* Variable fields, present in some `ts.app` Control Messages
* Payload, present in some `ts.app` Control Messages

### `ts.app` Control Message types

| Name        | Direction of flow                    | Description                                | TODO comments                |
| ----------- | ------------------------------------ | ------------------------------------------ | ---------------------------- |
| CONNECT     | Client to Server                     | Client request to connect to Server        | register client              |
| CONNACK     | Server to Client                     | Connect acknowledgment                     | client is ready to sub & pub |
| PUBLISH     | Client to Server or Server to Client | Publish message                            |                              |
| PUBACK      | Client to Server or Server to Client | Publish acknowledgment                     |                              |
| PUBREC       | Client to Server or Server to Client | Publish received (assured delivery part 1) |                              |
| PUBREL       | Client to Server or Server to Client | Publish release (assured delivery part 2)  |                              |
| PUBCOMP     | Client to Server or Server to Client | Publish complete (assured delivery part 3) |                              |
| SUBSCRIBE   | Client to Server                     | Client subscribe request                   |                              |
| SUBACK      | Server to Client                     | Subscribe acknowledgment                   |                              |
| UNSUBSCRIBE | Client to Server                     | Unsubscribe request                        |                              |
| UNSUBACK    | Server to Client                     | Unsubscribe acknowledgment                 |                              |
| PINGREQ     | Client to Server                     | PING request                               |                              |
| PINGRESP    | Server to Client                     | PING response                              |                              |
| DISCONNECT  | Client to Server                     | Client is disconnecting                    | this should be onunload      |

### General `ts.app` Control Message variable attributes

| Name        | messageId        | payload  |
| ----------- | ---------------- | -------- |
| CONNECT     | NO               | Required |
| CONNACK     | NO               | None     |
| PUBLISH     | YES (If QoS > 0) | Optional |
| PUBACK      | YES              | None     |
| PUBREC       | YES              | None     |
| PUBREL       | YES              | None     |
| PUBCOMP     | YES              | None     |
| SUBSCRIBE   | YES              | Required |
| SUBACK      | YES              | Required |
| UNSUBSCRIBE | YES              | Required |
| UNSUBACK    | YES              | None     |
| PINGREQ     | NO               | None     |
| PINGRESP    | NO               | None     |
| DISCONNECT  | NO               | None     |

### `ts.app` Control Messages

#### `CONNECT` – Client requests a connection to a Server

The `CONNECT` Control Message contains a number of attributes specifying the behavior of the `ts.app` connection.

```json
{
  "cmd": "connect",
  "version": "2.0.0",
  "clientId": {
    "userId": "48dc8179-9b31-4da4-b7d6-697b9d22c96d",
    "companyId": "f7508a3a-d8ef-4a7a-8725-5ef089c4b846",
    "appId": "Tradeshift.ChromeService"
  },
  "clean": false,
  "will": {
    "topic": "Tradeshift/ChromeService/status",
    "payload": "dead",
    "qos": 0,
    "retain": false
  },
  "keepAlive": 0
}
```

##### Client Identifier

* `clientId` (object, required)
  * `userId` (string, required)
  * `companyId` (string, required)
  * `appId` (string, required)

The Client Identifier (`clientId`) identifies the Client to the Server. This value is calculated from the required `clientId.userId`, `clientId.companyId` and `clientId.appId` fields. Each Client connecting to the Server has a unique ClientId. The ClientId MUST be used by Clients and by Servers to identify state that they hold relating to this `ts.app` Session between the Client and the Server.

The Client Identifier (`clientId`) MUST be present and all of the required sub-fields MUST be present.

If the Client does not supply any or supplies an incomplete `clientId`, the Server MUST respond to the CONNECT Message with a CONNACK `returnCode === 2` (identifier rejected) and then close the Connection.

##### CleanSession

* `clean` (boolean, required)

> **@TODO** Figure out how we would store this on the backend,
>
> **@TODO** Figure out how we would tell the Client, which subscriptions are active so it cat re-activate its listeners/handlers.
>
> **@TODO** CleanSession will be forced to be `true` until this is implemented.

If CleanSession is set to `false`, the Server MUST resume communications with the Client based on state from the current Session (as identified by Client Identifier). If there is no Session associated with the Client Identifier the Server MUST create a new Session. The Server MUST store the Session after the Client and Server as disconnected. After the disconnection of a Session that had CleanSession set to `false`, the Server MUST store further QoS 1 and QoS 2 messages that match any subscriptions that the client had at the time of disconnection as part of the Session state. It MUST NOT store any QoS 0 messages that meet the same criteria.

If CleanSession is set to `true`, the Client and Server MUST discard any previous Session and start a new one. This Session lasts as long as the Connection. State data associated with this Session MUST NOT be reused in any subsequent Session.

The Session state in the Client consists of:

* QoS 1 and QoS 2 messages which have been sent to the Server, but have not been completely acknowledged.
* QoS 2 messages which have been received from the Server, but have not been completely acknowledged.

The Session state in the Server consists of:

* The existence of a Session, even if the rest of the Session state is empty.
* The Client’s subscriptions.
* QoS 1 and QoS 2 messages which have been sent to the Client, but have not been completely acknowledged.
* QoS 1 and QoS 2 messages pending transmission to the Client.
* QoS 2 messages which have been received from the Client, but have not been completely acknowledged.

##### Will

* `will` (object, optional)
  * `topic` (string, required)
  * `payload` (string, optional)
  * `qos` (number, optional)
  * `retain` (boolean, optional)

If Will is set this indicates that, if the CONNECT request is accepted, a Will Message MUST be stored on the Server and associated with the Connection. The Will Message MUST be published when the Connection is subsequently closed unless the Will Message has been deleted by the Server on a receipt of a DISCONNECT Message.

Situations in which the Will Message is published include, but are not limited to:

* The Client fails to communicate within the Keep Alive time.
* The Client closes the Connection without first sending a DISCONNECT Message.

If Will is set, the Will QoS and Will Retain fields will be used by the Server, and the Will Topic field MUST be present in Will.

The Will Message MUST be removed from the stored Session state in the Server once it has been published or the Server has received a DISCONNECT Message from the Client.

If Will is not set, a Will Message MUST NOT be published when this Connection ends.

The Server SHOULD publish Will Messages promptly. In the case of a Server window being closed or a page refresh the Server MAY defer publication of Will Messages until a subsequent restart. If this happens there might be a delay between the time the server experienced failure and a Will Message being published.

##### Keep Alive

* `keepalive` (number, optional) The Keep Alive is a time interval measured in seconds. Expressed as a number, it is the maximum time interval that is permitted to elapse between the point at which the Client finishes transmitting one Control Message and the point it starts sending the next. It is the responsibility of the Client to ensure that the interval between Control Messages being sent does not exceed the Keep Alive value. In the absence of sending any other Control Messages, the Client MUST send a PINGREQ Message.

The Client can send PINGREQ at any time, irrespective of the Keep Alive value, and use the PINGRESP to determine that the network and the Server are working.

If the Keep Alive value is non-zero and the Server does not receive a Control Message from the Client within one and a half times the Keep Alive time period, it MUST disconnect the Connection to the Client as if the network had failed.

If a Client does not receive a PINGRESP Message within a reasonable amount of time after it has sent a PINGREQ, it SHOULD close the Connection to the Server.

A Keep Alive value of zero (`0`) has the effect of turning off the keep alive mechanism. This means that, in this case, the Server is not required to disconnect the Client on the grounds of inactivity.

Note that the Server is permitted to disconnect a Client that it determines to be inactive or non-responsive at any given time, regardless of the Keep Alive value provided by that Client.

#### `CONNACK` – Acknowledge connection request

The CONNACK Message is the message sent by the Server in response to a CONNECT Message received from a Client. The first message sent from the Server to the Client MUST be a CONNACK Message.

If the Client does not receive a CONNACK Message from the Server within 20 seconds, the Client SHOULD close the Connection.

```json
{
  "cmd": "connack",
  "returnCode": 0,
  "sessionPresent": false
}
```

##### Session Present

* `sessionPresent` (boolean, required)

If the Server accepts a connection with CleanSession set to `true`, the Server MUST set the Session Present to `false` in the CONNACK message in addition to setting a zero return code in the CONNACK message.

If the Server accepts a connection with CleanSession set to `false`, the value set in the Session Present depends on whether the Server already has stored Session state for the supplied ClientId. If the Server has stored Session state, it MUST set Session Present to `true` in the CONNACK message. If the Server does not have stored Session state, it MUST set Session Present to `false` in the CONNACK message. Thsi is in addition to setting a zero return code in the CONNACK message.

`@TODO continue here`

##### Connect Return code

* `returnCode` (number, required)

If a server sends a CONNACK message containing a non-zero return code it MUST then close the Connection.

| Return Code | Response                                          | Description                                           |
| ----------- | ------------------------------------------------- | ----------------------------------------------------- |
| 0           | Connection Accepted                               | Connection accepted                                   |
| 1           | Connection Refused, Unacceptable Protocol Version | Invalid `ts.app` protocol version requested by Client |
| 2           | Connection Refused, Identifier Rejected           | Invalid `clientId` supplied by the Client             |
| 3           |                                                   | Reserved                                              |
| 4           |                                                   | Reserved                                              |
| 5           | Connection Refused, Not Authorized                | The Client is not authorized to connect               |

#### `PUBLISH` – Publish message

A PUBLISH Control Message is send from a Client to a Server or from a Server to a Client to transport an App Message.

The Client uses a PUBLISH Message to send an App Message to the Server, for distribution to Clients with matching subscriptions.

The Server uses a PUBLISH Message to send an App Message to each Client which has a matching subscription.

When Clients make subscriptions with Topic Filters that include wildcards, it is possible for a Client’s subscriptions to overlap so that a published message might match multiple filters. In this case the Server MUST deliver the message to the Client respecting the maximum QoS of all the matching subscriptions. In addition, the Server MAY deliver further copies of the message, one for each additional matching subscription and respecting the subscription’s QoS in each case.

The action of the recipient when it receives a PUBLISH Message depends on the QoS level.

```json
{
  "cmd": "publish",
  "messageId": "26675c0e-1728-4558-b94d-eab3cf3628fc",
  "dup": false,
  "qos": 1,
  "retain": false,
  "topic": "Tradeshift/Chrome/Tradeshift/ChromeService/analytics/track"
}
```

##### Message Identifier

* `messageId` (string, optional)

The Message Identifier MUST be present for PUBLISH Messages where the QoS level is 1 or 2.

##### DUP

* `dup` (boolean, required)

If the DUP flag is set to `false`, it indicates that this is the first occasion that the Client or Server has attempted to send this `ts.app` PUBLISH Message. If the DUP flag is set to `true`, it indicates that this might be re-delivery of an earlier attempt to send the Message.

##### QoS

* `qos` (number, required)

| QoS Value | Description            | Expected Response |
| --------- | ---------------------- | ----------------- |
| 0         | At most once delivery  | None              |
| 1         | At least once delivery | PUBACK Message    |
| 2         | Exactly once delivery  | PUBREC Message    |

##### Retain

* `retain` (boolean, optional)

If the RETAIN flag is set to `true`, in a PUBLISH Message sent by a Client to a Server, the Server MUST store the App Message and its QoS, so that it can be delivered to future subscribers whose subscriptions match its topic name.

Additionally any existing retained message with the same topic name MUST be removed and any future subscribers for the topic will not receive a retained message.

##### Topic Name

* `topic` (string, required)

The Topic Name identifies the information channel to which payload data is published.

The Topic Name in the PUBLISH Message MUST NOT contain wildcard characters.

##### Payload

* `payload` (object, optional)

The Payload contains the App Message that is being published.

It is valid for a PUBLISH Message to contain a zero length payload.

#### `PUBACK` – Publish acknowledgment

A PUBACK Message is the response to a PUBLISH Message with QoS level 1.

```json
{
  "cmd": "puback",
  "messageId": "26675c0e-1728-4558-b94d-eab3cf3628fc"
}
```

> **@TODO**

#### `PUBREC` – Publish received (QoS 2 publish received, part 1)

A PUBREC Message is the response to a PUBLISH Message with QoS 2. It is the second message of the QoS 2 protocol exchange.

```json
{
  "cmd": "pubrec",
  "messageId": "26675c0e-1728-4558-b94d-eab3cf3628fc"
}
```

> **@TODO**

#### `PUBREL` – Publish release (QoS 2 publish received, part 2)

A PUBREL Message is the response to a PUBREC Message. It is the third message of the QoS 2 protocol exchange.

```json
{
  "cmd": "pubrel",
  "messageId": "26675c0e-1728-4558-b94d-eab3cf3628fc"
}
```

> **@TODO**

#### `PUBCOMP` – Publish complete (QoS 2 publish received, part 3)

The PUBCOMP Message is the response to a PUBREL Message. It is the fourth and final message of the QoS 2 protocol exchange.

```json
{
  "cmd": "pubcomp",
  "messageId": "26675c0e-1728-4558-b94d-eab3cf3628fc"
}
```

> **@TODO**

#### `SUBSCRIBE` - Subscribe to topics

The SUBSCRIBE Message is sent from the Client to the Server to create one or more Subscriptions. Each Subscription registers a Client’s interest in one or more Topics. The Server sends PUBLISH Messages to the Client in order to forward App Messages that were published to Topics that match these Subscriptions. The SUBSCRIBE Message also specifies (for each Subscription) the maximum QoS with which the Server can send App Messages to the Client.

```json
{
  "cmd": "subscribe",
  "messageId": "82830139-7bca-4176-b22e-3bda8ee0f757",
  "subscriptions": [
    {
      "topic": "Tradeshift/Chrome/#",
      "qos": 0
    },
    {
      "topic": "+/+/Tradeshift/ChromeService/#",
      "qos": 1
    },
    {
      "topic": "+/+/Tradeshift/Inbox/#",
      "qos": 0
    },
    {
      "topic": "+/+/+/+/analytics/#",
      "qos": 0
    }
  ]
}
```

> **@TODO**

#### `SUBACK` – Subscribe acknowledgment

A SUBACK Message is sent by the Server to the Client to confirm receipt and processing of a SUBSCRIBE Message.

A SUBACK Message contains a list of return codes, that specify the maximum QoS level that was granted in each Subscription that was requested by the SUBSCRIBE.

```json
{
  "cmd": "suback",
  "messageId": "82830139-7bca-4176-b22e-3bda8ee0f757",
  "subscriptions": [0, 1, 128, 0]
}
```

> **@TODO**

| Return code | Description | Maximum QoS |
| ----------- | ----------- | ----------- |
| 0           | Success     | 0           |
| 1           | Success     | 1           |
| 2           | Success     | 2           |
| 128         | Failure     |             |

#### `UNSUBSCRIBE` – Unsubscribe from topics

An UNSUBSCRIBE Message is sent by the Client to the Server, to unsubscribe from topics.

```json
{
  "cmd": "unsubscribe",
  "messageId": "fd4c19b2-d06b-4e41-a37e-7f2477c3ba27",
  "unsubscriptions": ["+/+/Tradeshift/Inbox/#", "+/+/+/+/analytics/#"]
}
```

> **@TODO**

The Topic Filters (whether they contain wildcards or not) supplied in an UNSUBSCRIBE message MUST be compared character-by-character with the current set of Topic Filters held by the Server for the Client. If any filter matches exactly then its owning Subscription is deleted, otherwise no additional processing occurs.

If a Server deletes a Subscription:

* It MUST stop adding any new messages for delivery to the Client.
* It MUST complete the delivery of any QoS 1 or QoS 2 messages which it has started to send to the Client.

The Server MUST respond to an UNSUBSUBCRIBE request by sending an UNSUBACK message. The UNSUBACK Message MUST have the same Message Identifier as the UNSUBSCRIBE Message.

Even where no Topic Subscriptions are deleted, the Server MUST respond with an UNSUBACK.

#### `UNSUBACK` – Unsubscribe acknowledgment

The UNSUBACK Message is sent by the Server to the Client to confirm receipt of an UNSUBSCRIBE Message.

```json
{
  "cmd": "unsuback",
  "messageId": "fd4c19b2-d06b-4e41-a37e-7f2477c3ba27"
}
```

> **@TODO**

#### `PINGREQ` – PING request

The PINGREQ Message is sent from a Client to the Server. It can be used to:

* Indicate to the Server that the Client is alive in the absence of any other Control Messages being sent from the Client to the Server.
* Request that the Server responds to confirm that it is alive.
* Exercise the network to indicate that the Connection is active.

This Message is used in Keep Alive processing.

```json
{
  "cmd": "pingreq"
}
```

> **@TODO**

#### `PINGRESP` – PING response

A PINGRESP Message is sent by the Server to the Client in response to a PINGREQ Message. It indicates that the Server is alive.

```json
{
  "cmd": "pingresp"
}
```

> **@TODO**

#### `DISCONNECT` – Disconnect notification

The DISCONNECT Message is the final Control Message sent from the Client to the Server. It indicates that the Client is disconnecting cleanly.

```json
{
  "cmd": "disconnect"
}
```

> **@TODO**
