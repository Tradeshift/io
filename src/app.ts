import { log } from './log';
import { appMessageValid, flushQueue, matchTopic, postMessage, queueMessage } from './msg';
import { AppDefinition, IoMessage, IoMessageType } from './types';

let appInstance: AppInstance;

let debug = log('ts:io:sub:NEW');
let appId: string | Window = '';
let token = '';

let spawnSubmit;

/**
 * Set of `on*()` listeners keyed by `topic`.
 * @type {Map<topic: string, handlers: Set<Function>>}
 */
const listeners = new Map<string, Set<(message?: IoMessage) => void>>();

/**
 * Set of `define()` handlers keyed by handler name.
 * @type {Map<method: string, handler: Function>}
 */
const lifecycle = new Map<string, () => void>();

/**
 * The Message Client AKA The App.
 */
export function app(): AppInstance {
	if (appInstance) {
		return appInstance;
	}

	appInstance = new AppInstance();

	function handleSpawn(data: MessageEvent): void {
		const message = data.data;
		debug('SPAWNED from %o - %O', message.source, message);

		const spawnHandler = lifecycle.get('spawn');
		if (spawnHandler) {
			/**
			 * @TODO Timeout handling!
			 */
			spawnHandler.apply({}, [
				message.data,
				function submit(data) {
					const msg = new IoMessage(IoMessageType.SPAWN_SUCCESS);
					msg.target = message.source;
					msg.token = token;
					msg.data = data;

					postMessage(msg);
				},
				message.source
			]);
		} else {
			// this app can't be spawned and we should send an error back to the source app
			const msg = new IoMessage(IoMessageType.SPAWN_FAIL);
			msg.source = message.source;
			msg.topic = message.topic;
			msg.token = token;
			msg.data = `${message.target} doesn't have a 'spawn' handler, it's not compatible with this SPAWN request.`;
			postMessage(msg);
		}
	}

	function handleConnack(data: MessageEvent) {
		const message = data.data;

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

		const connectHandler = lifecycle.get('connect');
		if (connectHandler) {
			connectHandler();
		}
	}

	/**
	 * Handle events this app is listening for.
	 * @param {MessageEvent} event
	 */
	const eventHandler = (event: MessageEvent) => {
		const message = event.data;

		// Only accept messages from the hub in window.top.
		if (event.source !== window.top) {
			return;
		}

		if (!isIoMessage(message)) {
			return;
		}

		// Call the matching handlers for the message topic.
		if (![IoMessageType.PING, IoMessageType.CONNACK].includes(message.type)) {
			debug(
				'Received %s %s from %o - %O',
				message.type,
				message.topic ? `('${message.topic}')` : '',
				message.source,
				message
			);
		}

		switch (message.type) {
			case IoMessageType.CONNACK:
				handleConnack(event);
				if (message.source) {
					handleSpawn(event);
				}
				return;

			case IoMessageType.EVENT:
				listeners.forEach(
					(eventListeners, topic) =>
						matchTopic(topic, message.topic) &&
						eventListeners.forEach(listener => listener(message))
				);
				break;

			case IoMessageType.SPAWN_SUCCESS:
				return spawnSubmit([null, message.data]);

			case IoMessageType.SPAWN_FAIL:
				return spawnSubmit([message.data, null]);

			case IoMessageType.PING:
				const msg = new IoMessage(IoMessageType.PONG);
				msg.token = token;
				return postMessage(msg);
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
	postMessage(new IoMessage(IoMessageType.CONNECT));

	return appInstance;
}


export class AppInstance {
	/**
	 * Handle messages.
	 * @param {string} topic Specific topic that we will call the handler for.
	 * @param {Function} listener Event listener.
	 * @returns {Function} Deregistrator of listener.
	 */
	public on(topic: string, listener: (message?: IoMessage) => void): () => void {
		let currentListeners = listeners.get(topic);
		if (!currentListeners) {
			currentListeners = new Set<() => void>();
		}
		currentListeners.add(listener);
		listeners.set(topic, currentListeners);

		/**
		 * Return the deregistrator.
		 */
		return () => this.off(topic, listener);
	}

	/**
	 * Handle message once.
	 * @param {string} topic Specific topic that we will call the handler for.
	 * @param {Function} handler Event listener.
	 * @returns {Function} Deregistrator of listener.
	 */
	public once(topic: string, listener: (message?: IoMessage) => void): () => void {
		const wrappedListener = (message?: IoMessage) => {
			this.off(topic, wrappedListener);
			listener(message);
		};
		this.on(topic, wrappedListener);

		/**
		 * Return the deregistrator.
		 */
		return () => this.off(topic, wrappedListener);
	}

	/**
	 * Remove message handler.
	 * @param  {string} topic Same as the topic which the handler uses.
	 * @param  {Function} listener Reference to the same listener to delete.
	 * @return {boolean} true on success.
	 */
	public off(topic: string, listener: (message?: IoMessage) => void): boolean {
		const eventListeners = listeners.get(topic);
		let deleted = false;
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
	}

	/**
	 * Publish message..
	 * @param {string} target Target appId. - No wildcards supported
	 * @param {string} topic Topic.
	 * @param {*=} data Data.
	 */
	public emit(topic: string, ...args): void {
		if (args.length === 0 || args.length > 2) {
			throw new Error(`ts.io().emit() called with invalid arguments. ${args.join(', ')}`);
		}

		let target, data;

		if (args.length === 1) {
			target = args[0];
		} else {
			data = args[0];
			target = args[1];
		}

		const message = new IoMessage(IoMessageType.EVENT);
		message.token = token;
		message.target = target;
		message.topic = topic;
		message.data = data;

		if (token) {
			debug('%o (%o) to %o - %o', 'EVENT', topic, target, data);
			postMessage(message);
		} else {
			debug('%o (%o) to %o - %o', 'EVENT(queued)', topic, target, data);
			queueMessage(message);
		}
	}

	public define(handlers: AppDefinition = {}) {
		if (!(typeof handlers === 'object')) {
			return;
		}

		if (typeof handlers.spawn === 'function') {
			lifecycle.set('spawn', handlers.spawn);
		}
		if (typeof handlers.connect === 'function') {
			lifecycle.set('connect', handlers.connect);
		}
	}

	/**
	 * Spawn app method
	 * @async
	 * @param {string} target Target appId. - No wildcards supported
	 * @param {*=} data Data.
	 * @returns {Promise}
	 */
	public async spawn(target: string, data = {}) {
		const message = new IoMessage(IoMessageType.SPAWN);
		message.token = token;
		message.target = target;
		message.data = data;

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
}

export function isIoMessage(message?: any): message is IoMessage {
	if (!message) {
		return false;
	}

	// check message is valid
	if (!appMessageValid(message)) {
		return false;
	}

	// The hub.top will get its own messages back, they will be ignored.
	if (message.target && appId && message.target !== appId) {
		return false;
	}

	return true;
}
