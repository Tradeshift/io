# `ts.app`
## AKA `Tradeshift App Messaging Protocol`

See WIP spec: https://github.com/Tradeshift/tradeshift-ui/issues/287

## New API
> v2.0

Heavily influenced by MQTT

### Terminology

* App Message
The data carried by the `ts.app protocol` between apps on the Tradeshift Platform.
When App Messages are transported by `ts.app` they have an asso

* topic



### API reference

`ts.app.connect()`, `ts.app.subscribe()`

`ts.app.load()`

`ts.app.publish(topic, message, [options], [callback])`
`ts.app.Client#publish(topic, message, [options], [callback])`

`ts.app.Client#exchange()`

### API use-cases

#### Send message to a single app
#### Send message to multiple apps

#### Receive message from a single app
#### Receive message from multiple apps

#### Send message to single app and handle response
#### Send message to multiple apps and handle response(s)

#### Load app and handle response