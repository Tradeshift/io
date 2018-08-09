import { log } from './log';
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
	 * Set of `on()` handlers keyed by `topic`.
	 * @type {Map<topic: string, handlers: Set<Function>>}
	 */
	const handlersByTopic = new Map();

	/**
	 * Set of `add()` handlers keyed by `method`.
	 * @type {Map<method: string, handler: Function>}
	 */
	const methodHandlers = new Map();

	appInstance = {
		/**
		 * Handle messages.
		 * @param {string} topic Specific topic that we will call the handler for.
		 * @param {Function} handler Handler of the message.
		 * @returns {Function} Deregistrator of listener.
		 */
		on(topic, handler) {
			if (handlersByTopic.has(topic)) {
				handlersByTopic.get(topic).add(handler);
			} else {
				handlersByTopic.set(topic, new Set([handler]));
			}

			/**
			 * Return the deregistrator.
			 */
			return () => this.off(topic, handler);
		},
		/**
		 * Handle message once.
		 * @param {string} topic Specific topic that we will call the handler for.
		 * @param {Function} handler Handler of the message.
		 * @returns {Function} Deregistrator of listener.
		 */
		once(topic, handler) {
			const wrappedHandler = message => {
				this.off(topic, wrappedHandler);
				handler(message);
			};
			this.on(topic, wrappedHandler);

			/**
			 * Return the deregistrator.
			 */
			return () => this.off(topic, wrappedHandler);
		},
		/**
		 * Remove message handler.
		 * @param  {string} topic Same as the topic which the handler uses.
		 * @param  {Function} handler Reference to the same handler to delete.
		 * @return {boolean} true on success.
		 */
		off(topic, handler) {
			const handlers = handlersByTopic.get(topic);
			let deleted;
			if (handlers) {
				deleted = handlers.delete(handler);
			}
			debug(
				'%s handler %o - %O',
				deleted ? 'Deleted' : "Didn't find",
				topic,
				handler
			);
			return deleted;
		},
		/**
		 * Publish message..
		 * @param {string} target Target appId. - No wildcards supported
		 * @param {string} topic Topic.
		 * @param {*=} data Data.
		 */
		emit(topic, target, data = {}) {
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
				debug('%o (%o) to %o - %o', 'PUBLISH(queued)', topic, target, data);
				queueMessage(message);
			}
		},
		add(method, handler) {
			methodHandlers.set(method, handler);
		},
		/**
		 * Do something RPC-style (spawn, request, etc.)
		 * @async
		 * @param {string} method Remote method to call (spawn, request, etc.)
		 * @param {string} target Target appId. - No wildcards supported
		 * @param {*=} data Data.
		 * @returns {Promise}
		 */
		async call(method, target, data = {}) {
			switch (method) {
				case 'spawn':
					const message = {
						type: 'SPAWN',
						target,
						data,
						token
					};
					if (token) {
						debug('%o to %o - %o', 'SPAWN', target, data);
						postMessage(message);
					} else {
						debug('%o to %o - %o', 'SPAWN(queued)', target, data);
						queueMessage(message);
					}
					// Wait for response from the app or some sort of failure
					return new Promise(resolve => {
						spawnResolve = resolve;
					});
			}
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
			if (methodHandlers.has('connect')) {
				methodHandlers.get('connect')();
			}
			if (message.source) {
				debug('SPAWNED from %o - %O', message.source, message);
				if (methodHandlers.has('spawn')) {
					/**
					 * @TODO Timeout handling!
					 */
					methodHandlers.get('spawn').apply({}, [
						message.data,
						function resolve(data) {
							postMessage({
								type: 'SPAWN-SUCCESS',
								target: message.source,
								data,
								token
							});
						},
						message.source
					]);
				} else {
					// this app can't be spawned and we should send an error back to the source app
					postMessage({
						type: 'SPAWN-FAIL',
						target: message.source,
						topic: message.topic,
						data:
							message.target +
							" doesn't have a 'spawn' handler, it's not compatible with this SPAWN request.",
						token
					});
				}
			}

			let queueLength = flushQueue(token);
			if (queueLength) {
				debug(
					'Publishing %s queued message%s',
					queueLength,
					queueLength === 1 ? '' : 's'
				);
			}
			return;
		}

		// Call the matching handlers for the message topic.
		if (message.type !== 'PING') {
			debug(
				'Received %s (%o) from %o - %O',
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
				return postMessage({ type: 'PONG', token });
			case 'SPAWN-SUCCESS':
				return spawnResolve([null, message.data]);
			case 'SPAWN-FAIL':
				return spawnResolve([message.data, null]);
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
