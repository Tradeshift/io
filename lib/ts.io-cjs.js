'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var uuid = _interopDefault(require('uuid'));

const colors = [
	// Red
	// 'hsl(0, 57%, 90%)',
	// 'hsl(0, 59%, 80%)',
	// 'hsl(0, 59%, 60%)',
	// 'hsl(0, 100%, 37%)',
	// 'hsl(0, 100%, 30%)',
	// 'hsl(0, 100%, 24%)',

	// Orange
	'hsl(32, 100%, 92%)',
	'hsl(33, 100%, 84%)',
	'hsl(33, 100%, 68%)',
	'hsl(33, 100%, 50%)',
	'hsl(31, 100%, 47%)',
	'hsl(26, 100%, 41%)',

	// Yellow
	'hsl(44, 95%, 92%)',
	'hsl(45, 95%, 85%)',
	'hsl(44, 96%, 70%)',
	'hsl(44, 98%, 53%)',
	'hsl(40, 100%, 52%)',
	'hsl(34, 100%, 49%)',

	// Green
	'hsl(99, 59%, 90%)',
	'hsl(99, 60%, 81%)',
	'hsl(99, 61%, 63%)',
	'hsl(99, 85%, 42%)',
	'hsl(101, 87%, 33%)',
	'hsl(103, 91%, 26%)',

	// Blue
	'hsl(199, 100%, 92%)',
	'hsl(199, 100%, 84%)',
	'hsl(199, 100%, 68%)',
	'hsl(199, 100%, 50%)',
	'hsl(201, 100%, 40%)',
	'hsl(203, 100%, 32%)',

	// Purple
	'hsl(295, 39%, 89%)',
	'hsl(295, 40%, 78%)',
	'hsl(295, 40%, 57%)',
	'hsl(295, 79%, 34%)',
	'hsl(294, 82%, 26%)',
	'hsl(296, 100%, 19%)',

	// Pink
	'hsl(325, 46%, 89%)',
	'hsl(325, 48%, 78%)',
	'hsl(325, 48%, 57%)',
	'hsl(325, 98%, 33%)',
	'hsl(327, 99%, 26%)',
	'hsl(329, 100%, 21%)'
];

function debugEnabled(namespace) {
	let debugExpression;
	try {
		debugExpression = window.localStorage.getItem('debug');
	} catch (error) {
		if (
			error instanceof DOMException &&
			(error.name === 'DataCloneError' ||
				error.code === 25) /* DATA_CLONE_ERR */
		) {
			console.warn(
				'ts.io error while setting up debug logging. You should ignore this message or set %o while sandboxing your iframe. %O',
				'allow-same-origin',
				error
			);
		} else {
			console.warn('ts.io error while setting up debug logging.', error);
		}
	}
	// No expression, no logging.
	if (!debugExpression) {
		return false;
	}
	const debugExpressionLength = debugExpression.length;
	// If the namespace is shorter than the expression, it definitely won't match.
	if (namespace.length < debugExpressionLength) {
		return false;
	}
	// '*' => Log everything.
	if (debugExpression === '*') {
		return true;
	}
	let shouldEnable = false;
	for (let i = 0; i < debugExpressionLength; i++) {
		const debugExpressionChar = debugExpression[i];
		const matchNamespace = debugExpressionChar === namespace[i];
		const atLastChar = i === debugExpressionLength - 1;
		if (matchNamespace || (atLastChar && debugExpressionChar === '*')) {
			shouldEnable = true;
			continue;
		} else {
			shouldEnable = false;
			break;
		}
	}
	return shouldEnable;
}

/**
 * Console debug logger.
 */
class Log {
	/**
	 * @constructor
	 * @param {string} namespace Namespace
	 * @param {string} color Color
	 */
	constructor(namespace, color) {
		this.namespace = namespace;
		this.color = color;
		this.previousTime = 0;
		/**
		 * @param {string=} message Message
		 * @param {any[]} optionalParams Optional Params
		 */
		this.log = (message, ...optionalParams) => {
			const now = window.performance.now();
			const deltaTime = now - (this.previousTime || now);
			this.previousTime = now;
			console.log(
				`%c${this.namespace}%c - ${message} - %c${parseFloat(deltaTime).toFixed(
					2
				)}ms`,
				`color: ${this.color};`,
				'font-weight: normal;',
				...optionalParams,
				`color: ${this.color};`
			);
		};
	}
}

/**
 * Generate a debug logger.
 * @param {string} namespace Namespace
 * @return {Function}
 */
function log(namespace) {
	if (!debugEnabled(namespace)) {
		return function() {};
	}

	let hash = 0;
	const namespaceLength = namespace.length;
	for (let i = 0; i < namespaceLength; i++) {
		hash = (hash << 5) - hash + namespace.charCodeAt(i);
		hash |= 0; // Convert to 32bit integer
	}

	const color = colors[Math.abs(hash) % colors.length];
	const debug = new Log(namespace, color);
	return debug.log;
}

class SpawnError extends Error {
	constructor(message) {
		super(message);
		this.name = 'ts:io:SpawnError';
	}
	toJSON() {
		return {
			name: this.name,
			message: this.message
		};
	}
}

/**
 * The Message.
 * @typedef {object} Message
 * @property {string} type The type of the message. (one of ['CONNECT', 'CONNACK', 'PUBLISH', 'PINGREQ', 'PINGRES'])
 * @property {string=} topic The topic of the message. (required for 'PUBLISH' type)
 * @property {string=} target Target appId. (required for ['PUBLISH', 'CONNACK', 'PINGREQ'] types)
 * @property {boolean} viaHub The message was brokered by the Hub.
 * @property {string=} token Hack-proof session token. (required for all types except 'CONNECT')
 * @property {*=} data Data to be passed with the message. Can be any type that is compatible with the structured clone algorithm,
 */

const targetOrigin = '*';

/**
 * Send message to target window.
 * @param {Message} message
 * @param {Window=} targetWindow
 */
function postMessage(message, targetWindow) {
	if (!targetWindow) {
		targetWindow = window.top;
	}
	if (message.data instanceof SpawnError) {
		message.data = message.data.toJSON();
	}
	try {
		targetWindow.postMessage(message, targetOrigin);
	} catch (error) {
		if (
			error instanceof DOMException &&
			(error.name === 'DataCloneError' ||
				error.code === 25) /* DATA_CLONE_ERR */
		) {
			throw new Error(
				"ts.io.publish called with { data } argument that can't be cloned using the structural clone algorithm."
			);
		} else {
			console.warn(
				'Something went wrong while sending postMessage.',
				error
			);
		}
	}
}

const messageQueue = [];

function queueMessage(message, targetWindow) {
	if (!targetWindow) {
		targetWindow = window.top;
	}
	messageQueue.push({
		targetWindow,
		message
	});
}

function flushQueue(token) {
	if (messageQueue.length) {
		messageQueue
			.reverse()
			.forEach(queuedMessage =>
				queuedMessage.targetWindow.postMessage(
					{ ...queuedMessage.message, token },
					targetOrigin
				)
			);
		return true;
	}
	return false;
}

/**
 * Validate message.
 * @param {Message} message
 */
function messageValid(message) {
	return message && message.type;
}

/**
 * Validate message for 'SPAWN', 'SPAWNED', 'PUBLISH', etc. complex types.
 * @param {Message} message
 */
function complexMessageValid(message) {
	return messageValid(message) && message.topic && message.target;
}

/**
 * Message is sent to an App.
 * @param {Message} message
 */
function appMessageValid(message) {
	return (
		messageValid(message) &&
		message.viaHub &&
		[
			'CONNACK',
			'PUBLISH',
			'PING',
			'SPAWN-RESOLVE',
			'SPAWN-REJECT'
		].includes(message.type)
	);
}

/**
 * Message sent to the Hub.
 * @param {Message} message
 */
function hubMessageValid(message) {
	return (
		messageValid(message) &&
		!message.viaHub &&
		[
			'CONNECT',
			'PUBLISH',
			'PONG',
			'SPAWN',
			'SPAWN-RESOLVE',
			'SPAWN-REJECT'
		].includes(message.type)
	);
}

/**
 * Does the topic match the expression?
 *
 * @todo Support more than '*' or exact match.
 *
 * @param {string} topicExpression Topic expression to match.
 * @param {string} topic Topic to match.
 */
function matchTopic(topicExpression, topic) {
	if (topicExpression === '*') {
		return true;
	}
	return topicExpression === topic;
}

let appInstance;

/**
 * The Message Client AKA The App.
 */
function app() {
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

class LifecycleHandler {
	onconstruct(target, parent) {
		return target; // In case there are redirects, the Chrome can supply a different appId
	}
	onconnect(target, win) {}
	onresolve(target, parent, topic, data) {}
}

/**
 * Are we in the same frame as the Tradeshift® Chrome™?
 * @return {boolean}
 */
function isChromeWindow() {
	return window.ts && window.ts.chrome !== undefined;
}

/**
 * Heartbeat regularity in ms.
 * @type {number}
 */
const HEARTBEAT = 3333;

/**
 * Harcoded appId for the Tradeshift® Chrome™
 * @type {string}
 */
const CHROME_APP_ID = 'Tradeshift.Chrome';

let hubInstance;

/**
 * Special features supplied by the Tradeshift® Chrome™.
 * @typedef {object} ChromeWindowFeatures
 * @property {function(Window): string} appIdByWindow Called to get an appId based on a Window object.
 * @property {function(string, Window): Window} windowByAppId Called to get a window object based on an appId and the requesting app's Window object.
 * @property {function(Window, string): void} appTimeout Called when an app fails to reply in time to a PING request.
 * @property {object: void} handlers Contains all handlers for SPAWN, etc.
 */

function invalidFunction(name) {
	return function() {
		throw new Error(
			`Can't initialize ts.io() Hub. ${name}() wasn't passed.`
		);
	};
}

/**
 * The Message Broker AKA The Hub.
 * @param {ChromeWindowFeatures} chrome Special features supplied by the Tradeshift® Chrome™
 */
function hub(chrome) {
	if (hubInstance) {
		return hubInstance;
	}

	const {
		appIdByWindow = invalidFunction('appIdByWindow'),
		windowByAppId = invalidFunction('appTimeout'),
		appTimeout = function() {},
		handlers = {
			spawn: new LifecycleHandler()
		}
	} = chrome;

	/**
	 * Quickly test that appIdByWindow & windowByAppId work for 'Tradeshift.Chrome'
	 */
	{
		const testChromeWindow = windowByAppId(CHROME_APP_ID);
		const testNotWindow = !(testChromeWindow instanceof Window);
		const testNotAppId = appIdByWindow(testChromeWindow) !== CHROME_APP_ID;
		if (testNotWindow) {
			throw new Error(
				`Can't initialize ts.io() Hub. Expected windowByAppId('${CHROME_APP_ID}') to return a 'Window' object.`
			);
		} else if (testNotAppId) {
			throw new Error(
				`Can't initialize ts.io() Hub. Expected appIdByWindow(windowByAppId('${CHROME_APP_ID}')) to return '${CHROME_APP_ID}'.`
			);
		}
	}

	const debug = log('ts:io:top');
	/**
	 * WeakMap of frames with apps.
	 * @type {WeakMap<Window, Object<appId: string, token: string>}
	 */
	const appWindows = new WeakMap();
	/**
	 * Map of when the last PONG, or any other message was sent from an app.
	 * @type {Map<token: string, Object<lastPong: DOMHighResTimeStamp, timeoutIds: Set<timeoutId: number>}
	 */
	const appPongs = new Map();

	const appSpawns = [];

	/*
	1. after sending CONNACK to an app, PING it after HEARTBEAT ms
	2. if it replies, wait HEARTBEAT ms and PING again, - repeat forever
	3. if it doesn't reply within 4 * HEARTBEAT ms, consider the client dead and remove it from the list while removing all traces of it
	*/
	function pingApp(opts) {
		const { appId, token, targetWindow } = opts;

		const now = window.performance.now();
		const appPongInfo = appPongs.get(token);
		const lastPong = (appPongInfo && appPongInfo.lastPong) || now;
		if (now - lastPong < 3 * HEARTBEAT) {
			appPongInfo.timeoutIds.add(
				setTimeout(() => pingApp(opts), HEARTBEAT)
			);
			postMessage(
				{ type: 'PING', viaHub: true, target: appId, token },
				targetWindow
			);
		} else {
			debug('App timed out, considering it dead! %o', appId);
			appTimeout(targetWindow, appId);
			try {
				killApp(targetWindow);
			} catch (error) {
				console.error(error);
			}
		}
	}

	function killApp(targetWindow) {
		try {
			const { appId, token } = appWindows.get(targetWindow);
			debug('Killing app %o', appId);
			appPongs
				.get(token)
				.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
			appPongs.delete(token);
			appWindows.delete(targetWindow);
		} catch (error) {
			console.error(error);
		}
	}

	window.addEventListener('message', function(event) {
		const message = event.data;

		// Only accept valid messages from apps.
		if (!hubMessageValid(message)) {
			return;
		}

		// Message from a frame we don't know yet.
		if (!appWindows.has(event.source)) {
			// The only command should be CONNECT, we fail otherwise.
			if (message.type === 'CONNECT') {
				const appId = appIdByWindow(event.source);
				const token = uuid();
				debug('CONNECT %o', appId);
				appWindows.set(event.source, { appId, token });
				const spawnWaiting = appSpawns.findIndex(
					spawn => spawn.appId === appId
				);
				const connackMessage = {
					type: 'CONNACK',
					viaHub: true,
					target: appId,
					token
				};
				if (spawnWaiting !== -1) {
					handlers.spawn.onconnect(appId, event.source);
					const { topic, data, source } = appSpawns[
						spawnWaiting
					].message;
					connackMessage.source = source;
					connackMessage.topic = topic;
					connackMessage.data = data;
					appSpawns.splice(spawnWaiting, 1);
				}
				postMessage(connackMessage, event.source);
				const pingOpts = { targetWindow: event.source, appId, token };
				const timeoutId = setTimeout(
					() => pingApp(pingOpts),
					HEARTBEAT
				);
				appPongs.set(token, {
					lastPong: window.performance.now(),
					timeoutIds: new Set([timeoutId])
				});
				return;
			} else {
				console.warn(
					'Unexpected critical error! ts.app sent message without being connected!',
					event
				);
				return;
			}
		}

		if (message.token !== appWindows.get(event.source).token) {
			console.warn(
				'Token seems invalid, discarding message!\n' +
					JSON.stringify(message, null, 2)
			);
			return;
		}

		const appWindow = appWindows.get(event.source);
		const token = (message.token = appWindow.token);
		message.source = appWindow.appId;
		message.viaHub = true;

		if (message.source === message.target) {
			console.warn(
				'Source and destination match, discarding message!\n' +
					JSON.stringify(message, null, 2)
			);
			return;
		}

		switch (message.type) {
			case 'PUBLISH':
			case 'SPAWN-RESOLVE':
			case 'SPAWN-REJECT': {
				if (!complexMessageValid(message)) {
					console.warn(
						'Message incomplete for a %s command!\n%O',
						message.type,
						JSON.stringify(message)
					);
					return;
				}
				/**
				 * @TODO Handle the case when the Chrome blocks certain targets for certain sources
				 */
				const targetWindow = windowByAppId(
					message.target,
					event.source
				);
				debug(
					'Routing %o from %o to %o - %O',
					message.type,
					message.source,
					message.target,
					message
				);
				postMessage(message, targetWindow);
				if (message.type.indexOf('SPAWN') === 0) {
					handlers.spawn.onresolve(
						message.source,
						message.target,
						message.topic,
						message.data
					);
				}
				break;
			}
			case 'SPAWN': {
				if (!complexMessageValid(message)) {
					console.warn(
						'Message incomplete for a SPAWN command!\n' +
							JSON.stringify(message)
					);
					return;
				}

				debug(
					'Spawning %o from %o - %O',
					message.target,
					message.source,
					message
				);
				try {
					const appId = handlers.spawn.onconstruct(
						message.target,
						message.source
					);
					appSpawns.push({ appId, message });
				} catch (e) {
					postMessage({
						type: 'SPAWN-REJECT',
						source: CHROME_APP_ID,
						target: message.source,
						token: appWindows.get(windowByAppId(CHROME_APP_ID))
							.token,
						topic: message.topic,
						data: new SpawnError(
							`${
								message.target
							} is not activated on the current user's account`
						)
					});
				}
				break;
			}
			case 'PONG':
				appPongs.set(token, {
					...appPongs.get(token),
					lastPong: window.performance.now()
				});
				break;
			default:
				debug('* %o', event.data);
				break;
		}
	});

	hubInstance = {
		top: app,
		killApp
	};
	return hubInstance;
}

const api = isChromeWindow() ? hub : app;

api.LifecycleHandler = LifecycleHandler;
api.SpawnError = SpawnError;

module.exports = api;
//# sourceMappingURL=ts.io-cjs.js.map
