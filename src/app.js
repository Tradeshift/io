import { log } from './log';
import { postMessage, matchTopic, appMessageValid } from './msg';

/**
 * The Message Client AKA The App.
 */
export function app() {
	let debug = log('ts:io:sub');

	let appId = '';
	let token = '';

	/**
	 * Set of `on()` handlers keyed by `topic`
	 * @type {Map<topic: string, handlers: Set<Function>>}
	 */
	const handlersByTopic = new Map();

	const api = {
		/**
		 * Handle messages.
		 * @returns {Function} Deregistrator of listener.
		 */
		on: function() {
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
				throw new Error('ts.app.on called with invalid arguments.', arguments);
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
		 * @alias publish
		 * @returns {Object} Chainable
		 */
		publish: function() {
			/**
			 * Target appId.
			 * No wildcards supported.
			 * @type {string}
			 */
			let target = '';
			/**
			 * Topic.
			 * @optional
			 * @type {string}
			 */
			let topic = '';
			/**
			 * Data.
			 * @optional
			 * @type {*}
			 */
			let data = {};

			if (arguments.length === 1 && typeof arguments[0] === 'object') {
				/**
				 * Single argument - {target, topic, data}
				 */
				target = arguments[0].target;
				topic = arguments[0].topic;
				data = arguments[0].data;
			} else if (
				arguments.length >= 2 &&
				typeof arguments[0] === 'string' &&
				typeof arguments[1] === 'string'
			) {
				/**
				 * Two arguments - target, topic
				 */
				target = arguments[0];
				topic = arguments[1];
				if (arguments.length === 3) {
					/**
					 * Three arguments - target, topic, data
					 */
					data = arguments[2];
				}
			}
			debug('%o (%o) to %o - %o', 'PUBLISH', topic, target, data);
			postMessage({ type: 'PUBLISH', target, topic, data, token });
			return this;
		},
		/**
		 * Request a response.
		 * @returns {Promise}
		 */
		request: function() {},
		/**
		 * Spawn an app...
		 * @alias spawn
		 * @returns {Promise}
		 */
		spawn: function() {},
		/**
		 * Open an app..
		 * @alias open
		 * @returns {Promise}
		 */
		open: function() {}
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
			debug('CONNECTED');

			return;
		}

		// Call the matching handlers for the message topic.
		switch (message.type) {
			case 'PUBLISH':
				debug(
					'%o (%o) from %o - %O',
					message.type,
					message.topic,
					message.source,
					message
				);
				handlersByTopic.forEach(
					(handlers, topic) =>
						matchTopic(topic, message.topic) &&
						handlers.forEach(handler => handler(message))
				);
				break;
			case 'PING':
				postMessage({ type: 'PONG', token });
				break;
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

	return api;
}
