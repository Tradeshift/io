import { log } from './log';
import { SpawnError } from './err';
import {
	postMessage,
	queueMessage,
	flushQueue,
	matchTopic,
	appMessageValid
} from './msg';

let appInstance;

/**
 * The Message Client AKA The App.
 */
export function app() {
	if (appInstance) {
		return appInstance;
	}

	let debug = log('ts:io:sub');

	let appId = '';
	let token = '';

	let spawnResolve;

	/**
	 * Set of `on()` handlers keyed by `topic`
	 * @type {Map<topic: string, handlers: Set<Function>>}
	 */
	const handlersByTopic = new Map();

	appInstance = {
		/**
		 * Handle messages.
		 * @returns {Function} Deregistrator of listener.
		 */
		on() {
			/**
			 * Specific topic that we will call the handler for.
			 * @type {string|undefined}
			 */
			let topic = '*';
			/**
			 * Handler of the message.
			 * @type {function}
			 */
			let handler = function() {};

			if (arguments.length === 1 && typeof arguments[0] === 'function') {
				/**
				 * Single argument - handler.
				 */
				handler = arguments[0];
			} else if (
				arguments.length === 2 &&
				typeof arguments[0] === 'string' &&
				typeof arguments[1] === 'function'
			) {
				/**
				 * Two arguments - topic and handler.
				 */
				topic = arguments[0];
				handler = arguments[1];
			} else {
				throw new Error(
					'ts.io().on() called with invalid arguments.',
					arguments
				);
			}

			if (handlersByTopic.has(topic)) {
				handlersByTopic.get(topic).add(handler);
			} else {
				handlersByTopic.set(topic, new Set([handler]));
			}

			/**
			 * Return the deregistrator.
			 */
			return () => {
				const handlers = handlersByTopic.get(topic);
				if (handlers) {
					handlers.delete(handler);
				}
				debug(
					'%s handler %o - %O',
					handlers ? 'Deleted' : "Didn't find",
					topic,
					handler
				);
				return this;
			};
		},
		/**
		 * Publish message..
		 * @param {string} target Target appId. - No wildcards supported
		 * @param {string} topic Topic.
		 * @param {*=} data Data.
		 * @returns {Object} Chainable
		 */
		publish(target, topic, data = {}) {
			if (arguments.length < 2) {
				throw new Error(
					'ts.io().publish() called with invalid arguments.',
					arguments
				);
			}
			const message = { type: 'PUBLISH', target, topic, data, token };
			if (token) {
				debug('%o (%o) to %o - %o', 'PUBLISH', topic, target, data);
				postMessage(message);
			} else {
				debug(
					'%o (%o) to %o - %o',
					'PUBLISH(queued)',
					topic,
					target,
					data
				);
				queueMessage(message);
			}
			return this;
		},
		/**
		 * Request a response.
		 * @async
		 * @param {string} target Target appId. - No wildcards supported
		 * @param {string} topic Topic.
		 * @param {*=} data Data.
		 * @returns {Promise}
		 */
		async request(target, topic, data = {}) {
			const error = null;
			const result = {};
			return new Promise(resolve => {
				resolve([error, result]);
			});
		},
		/**
		 * Spawn an app...
		 * @async
		 * @param {string} target Target appId. - No wildcards supported
		 * @param {string} topic Topic.
		 * @param {*=} data Data.
		 * @returns {Promise}
		 */
		async spawn(target, topic, data = {}) {
			if (arguments.length < 2) {
				throw new Error(
					'ts.io().spawn() called with invalid arguments.',
					arguments
				);
			}
			const message = { type: 'SPAWN', target, topic, data, token };
			if (token) {
				debug('%o (%o) to %o - %o', 'SPAWN', topic, target, data);
				postMessage(message);
			} else {
				debug(
					'%o (%o) to %o - %o',
					'SPAWN(queued)',
					topic,
					target,
					data
				);
				queueMessage(message);
			}
			// Wait for response from the app or some sort of failure
			return new Promise(resolve => {
				spawnResolve = resolve;
			});
		}
	};

	/**
	 * Handle events this app is listening for.
	 * @param {MessageEvent} event
	 */
	function eventHandler(event) {
		const message = event.data;
		// Only accept messages from the hub in window.top.
		if (event.source !== window.top || !appMessageValid(message)) {
			return;
		}
		// The hub.top will get its own messages back, they will be ignored.
		if (message.target && appId && message.target !== appId) {
			return;
		}

		if (message.type === 'CONNACK') {
			appId = message.target || '';
			token = message.token || '';
			debug = log('ts:io:sub:' + appId);
			debug('CONNECTED %o', message);
			if (flushQueue(token)) {
				debug('Publishing queued messages');
			}

			// If the app has been spawned, CONNACK will have a topic and optional data
			if (message.topic) {
				debug(
					'SPAWNED (%o) from %o - %O',
					message.topic,
					message.source,
					message
				);
				if (appInstance.onspawn) {
					/**
					 * @TODO Timeout handling!
					 */
					appInstance.onspawn(
						message,
						function resolve(data) {
							postMessage({
								type: 'SPAWN-RESOLVE',
								target: message.source,
								topic: message.topic,
								data,
								token
							});
						},
						function reject(data) {
							postMessage({
								type: 'SPAWN-REJECT',
								target: message.source,
								topic: message.topic,
								data,
								token
							});
						}
					);
				} else {
					// this app can't be spawned and we should send an error back to the source app
					postMessage({
						type: 'SPAWN-REJECT',
						target: message.source,
						topic: message.topic,
						data: new SpawnError(
							`${
								message.target
							} doesn't have an 'onspawn' handler, it's not compatible with this SPAWN request.`
						),
						token
					});
				}
			}
			return;
		}

		// Call the matching handlers for the message topic.
		if (message.type !== 'PING') {
			debug(
				'%s (%o) from %o - %O',
				message.type,
				message.topic,
				message.source,
				message
			);
		}
		switch (message.type) {
			case 'PUBLISH':
				handlersByTopic.forEach(
					(handlers, topic) =>
						matchTopic(topic, message.topic) &&
						handlers.forEach(handler => handler(message))
				);
				break;
			case 'PING':
				postMessage({ type: 'PONG', token });
				break;
			case 'SPAWN-RESOLVE':
				spawnResolve([null, message.data]);
			case 'SPAWN-REJECT':
				if (
					message.data &&
					message.data.name &&
					message.data.name === 'ts:io:SpawnError'
				) {
					message.data = new SpawnError(message.data.message);
				}
				spawnResolve([message.data, null]);
			default:
				break;
		}
	}

	/**
	 * Start listening to messages from window.top.
	 */
	window.addEventListener('message', eventHandler);

	/**
	 * Send CONNECT to Hub.
	 */
	debug('Connecting…');
	postMessage({ type: 'CONNECT' });

	return appInstance;
}
