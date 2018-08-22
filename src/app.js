import { log } from './log';
import {
	postMessage,
	queueMessage,
	flushQueue,
	matchTopic,
	appMessageValid
} from './msg';

let appInstance;

let debug = log('ts:io:sub:NEW');
let appId = '';
let token = '';

let spawnSubmit;

/**
 * Set of `on*()` listeners keyed by `topic`.
 * @type {Map<topic: string, handlers: Set<Function>>}
 */
const listeners = new Map();

/**
 * Set of `define()` handlers keyed by handler name.
 * @type {Map<method: string, handler: Function>}
 */
const lifecycle = new Map();

/**
 * The Message Client AKA The App.
 */
export function app() {
	if (appInstance) {
		return appInstance;
	}

	appInstance = {
		/**
		 * Handle messages.
		 * @param {string} topic Specific topic that we will call the handler for.
		 * @param {Function} listener Event listener.
		 * @returns {Function} Deregistrator of listener.
		 */
		on(topic, listener) {
			if (listeners.has(topic)) {
				listeners.get(topic).add(listener);
			} else {
				listeners.set(topic, new Set([listener]));
			}

			/**
			 * Return the deregistrator.
			 */
			return () => appInstance.off(topic, listener);
		},
		/**
		 * Handle message once.
		 * @param {string} topic Specific topic that we will call the handler for.
		 * @param {Function} handler Event listener.
		 * @returns {Function} Deregistrator of listener.
		 */
		once(topic, listener) {
			const wrappedListener = message => {
				this.off(topic, wrappedListener);
				listener(message);
			};
			this.on(topic, wrappedListener);

			/**
			 * Return the deregistrator.
			 */
			return () => this.off(topic, wrappedListener);
		},
		/**
		 * Remove message handler.
		 * @param  {string} topic Same as the topic which the handler uses.
		 * @param  {Function} listener Reference to the same listener to delete.
		 * @return {boolean} true on success.
		 */
		off(topic, listener) {
			const eventListeners = listeners.get(topic);
			let deleted;
			if (eventListeners) {
				deleted = eventListeners.delete(listener);
			}
			debug(
				'%s handler %o - %O',
				deleted ? 'Deleted' : "Didn't find",
				topic,
				listener
			);
			return deleted;
		},
		/**
		 * Publish message..
		 * @param {string} target Target appId. - No wildcards supported
		 * @param {string} topic Topic.
		 * @param {*=} data Data.
		 */
		emit(topic, ...args) {
			if (args.length === 0 || args.length > 2) {
				throw new Error(
					'ts.io().emit() called with invalid arguments.',
					arguments
				);
			}

			let target, data;

			if (args.length === 1) {
				target = args[0];
			} else {
				data = args[0];
				target = args[1];
			}

			const message = {
				type: 'EVENT',
				token,
				target,
				topic,
				data
			};
			if (token) {
				debug('%o (%o) to %o - %o', 'EVENT', topic, target, data);
				postMessage(message);
			} else {
				debug('%o (%o) to %o - %o', 'EVENT(queued)', topic, target, data);
				queueMessage(message);
			}
		},
		define(handlers) {
			if (!(typeof handlers === 'object')) {
				return;
			}

			if (typeof handlers.spawn === 'function') {
				lifecycle.set('spawn', handlers.spawn);
			}
			if (typeof handlers.connect === 'function') {
				lifecycle.set('connect', handlers.connect);
			}
		},
		/**
		 * Spawn app method
		 * @async
		 * @param {string} target Target appId. - No wildcards supported
		 * @param {*=} data Data.
		 * @returns {Promise}
		 */
		async spawn(target, data = {}) {
			const message = {
				type: 'SPAWN',
				token,
				target,
				data
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
				spawnSubmit = resolve;
			});
		}
	};

	function handleSpawn({ data: message, source: sourceWindow }) {
		debug('SPAWNED from %o - %O', message.source, message);

		if (lifecycle.has('spawn')) {
			/**
			 * @TODO Timeout handling!
			 */
			lifecycle.get('spawn').apply({}, [
				message.data,
				function submit(data) {
					postMessage({
						type: 'SPAWN-SUCCESS',
						target: message.source,
						token,
						data
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

	function handleConnack({ data: message, source: sourceWindow }) {
		appId = message.target || '';
		token = message.token || '';
		debug = log('ts:io:sub:' + appId);

		debug('CONNECTED %o', message);

		const queueLength = flushQueue(message.token);
		if (queueLength) {
			debug(
				'Publishing %s queued events%s',
				queueLength,
				queueLength === 1 ? '' : 's'
			);
		}

		if (lifecycle.has('connect')) {
			lifecycle.get('connect')();
		}
	}

	/**
	 * Handle events this app is listening for.
	 * @param {MessageEvent} event
	 */
	const eventHandler = event => {
		const message = event.data;
		// Only accept messages from the hub in window.top.
		if (event.source !== window.top || !appMessageValid(message)) {
			return;
		}
		// The hub.top will get its own messages back, they will be ignored.
		if (message.target && appId && message.target !== appId) {
			return;
		}

		// Call the matching handlers for the message topic.
		if (!['PING', 'CONNACK'].includes(message.type)) {
			debug(
				'Received %s %s from %o - %O',
				message.type,
				message.topic ? `('${message.topic}')` : '',
				message.source,
				message
			);
		}

		switch (message.type) {
			case 'CONNACK':
				handleConnack(event);
				if (message.source) {
					handleSpawn(event);
				}
				return;

			case 'EVENT':
				listeners.forEach(
					(eventListeners, topic) =>
						matchTopic(topic, message.topic) &&
						eventListeners.forEach(listener => listener(message))
				);
				break;

			case 'SPAWN-SUCCESS':
				return spawnSubmit([null, message.data]);

			case 'SPAWN-FAIL':
				return spawnSubmit([message.data, null]);

			case 'PING':
				return postMessage({ type: 'PONG', token });
			default:
				break;
		}
	};

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
