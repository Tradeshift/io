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
	const lifeCycleMethodHandlers = new Map();

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
					'ts.io().emit() called with invalid arguments.',
					arguments
				);
			}
			const message = { type: 'EVENT', target, topic, data, token };
			if (token) {
				debug('%o (%o) to %o - %o', 'EVENT', topic, target, data);
				postMessage(message);
			} else {
				debug('%o (%o) to %o - %o', 'EVENT(queued)', topic, target, data);
				queueMessage(message);
			}
		},
		define(lifecyle) {
			if (lifecyle.spawn) {
				lifeCycleMethodHandlers.set('spawn', handler);
			}
		},
		/**
		 * Do something RPC-style (spawn, request, etc.)
		 * @async
		 * @param {string} method Remote method to call (spawn, request, etc.)
		 * @param {string} target Target appId. - No wildcards supported
		 * @param {*=} data Data.
		 * @returns {Promise}
		 */
		async spawn(target, data = {}) {
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
	};

	function handleSpawn(event) {
		const message = event.data;

		debug('SPAWNED from %o - %O', message.source, message);

		if (lifeCycleMethodHandlers.has('spawn')) {
			/**
			 * @TODO Timeout handling!
			 */
			lifeCycleMethodHandlers.get('spawn').apply({}, [
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

	function handleConnect(event) {
		const message = event.data;

		if (lifeCycleMethodHandlers.has('connect')) {
			lifeCycleMethodHandlers.get('connect')();
		}

		if (message.source) {
		}
	}
	/**
	 * Handle events this app is listening for.
	 * @param {MessageEvent} event
	 */
	function eventHandler(event) {
		const message = event.data;
		appId = message.target || '';
		token = message.token || '';
		debug = log('ts:io:sub:' + appId);
		// Only accept messages from the hub in window.top.
		if (event.source !== window.top || !appMessageValid(message)) {
			return;
		}
		// The hub.top will get its own messages back, they will be ignored.
		if (message.target && appId && message.target !== appId) {
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
			case 'CONNACK': {
				debug('CONNECTED %o', message);

				handleConnect(event);

				let queueLength = flushQueue(token);
				if (queueLength) {
					debug(
						'Publishing %s queued events%s',
						queueLength,
						queueLength === 1 ? '' : 's'
					);
				}

				break;
			}
			case 'EVENT':
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
