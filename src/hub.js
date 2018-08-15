import uuid from 'uuid';
import { log } from './log';
import { app } from './app';
import { postMessage, hubMessageValid, complexMessageValid } from './msg';
import { HEARTBEAT as _HEARTBEAT, CHROME_APP_ID } from './lib';

let hubInstance;

/**
 * Special features supplied by the Tradeshift® Chrome™.
 * @typedef {object} ChromeWindowFeatures
 * @property {function(Window): string} appByWindow Called to get an appId based on a Window object.
 * @property {function(string, Window): Window} windowByApp Called to get a window object based on an appId and the requesting app's Window object.
 */

function invalidFunction(name) {
	return function() {
		throw new Error(`Can't initialize ts.io() Hub. ${name}() wasn't passed.`);
	};
}

/**
 * The Message Broker AKA The Hub.
 * @param {ChromeWindowFeatures} chrome Special features supplied by the Tradeshift® Chrome™
 */
export function hub(chrome) {
	if (hubInstance) {
		return hubInstance;
	}
	hubInstance = { HEARTBEAT: _HEARTBEAT };

	const {
		appByWindow = invalidFunction('appByWindow'),
		windowByApp = invalidFunction('windowByApp')
	} = chrome;

	/**
	 * Quickly test that appByWindow & windowByApp work for 'Tradeshift.Chrome'
	 */
	{
		const testChromeWindow = windowByApp(CHROME_APP_ID);
		const testNotWindow = !(testChromeWindow instanceof Window);
		const testNotAppId = appByWindow(testChromeWindow) !== CHROME_APP_ID;
		if (testNotWindow) {
			throw new Error(
				`Can't initialize ts.io() Hub. Expected windowByApp('${CHROME_APP_ID}') to return a 'Window' object.`
			);
		} else if (testNotAppId) {
			throw new Error(
				`Can't initialize ts.io() Hub. Expected appByWindow(windowByApp('${CHROME_APP_ID}')) to return '${CHROME_APP_ID}'.`
			);
		}
	}

	const debug = log('ts:io:top');

	/**
	 * Set of `add()` handlers keyed by `method`.
	 * @type {Map<method: string, handler: Function>}
	 */
	const methodHandlers = new Map();

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

	const add = (method, handler) => {
		methodHandlers.set(method, handler);
	};
	const call = (method, argsArr) => {
		if (methodHandlers.has(method)) {
			return methodHandlers.get(method).apply({}, argsArr);
		}
	};

	add('kill', function(targetWindow) {
		try {
			const { appId, token } = appWindows.get(targetWindow);
			debug('Killing app %o', appId);
			appPongs
				.get(token)
				.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
			appPongs.delete(token);
			appWindows.delete(targetWindow);
		} catch (error) {
			debug("App couldn't be killed in %o - %o", targetWindow, error);
		}
	});

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
		let appAlive = now - lastPong < 3 * hubInstance.HEARTBEAT;
		if (appAlive) {
			appPongInfo.timeoutIds.add(
				setTimeout(() => pingApp(opts), hubInstance.HEARTBEAT)
			);
			try {
				postMessage(
					{ type: 'PING', viaHub: true, target: appId, token },
					targetWindow
				);
			} catch (error) {
				appAlive = false;
			}
		}
		if (!appAlive) {
			debug('App timed out, considering it dead! %o', appId);
			call('timeout', [targetWindow, appId]);
			try {
				call('kill', [targetWindow]);
			} catch (error) {
				console.warn("App couldn't be killed", error);
			}
		}
	}

	function handleAppConnect(event) {
		const appId = appByWindow(event.source);
		const token = uuid();
		const spawnWaiting = appSpawns.findIndex(spawn => spawn.appId === appId);
		const connackMessage = {
			type: 'CONNACK',
			viaHub: true,
			target: appId,
			token
		};
		appWindows.set(event.source, { appId, token });

		debug('CONNECT %o', appId);

		if (spawnWaiting !== -1) {
			const { data, source } = appSpawns[spawnWaiting].message;
			connackMessage.source = source;
			connackMessage.data = data;
			appSpawns.splice(spawnWaiting, 1);
		}

		postMessage(connackMessage, event.source);

		const pingOpts = { targetWindow: event.source, appId, token };
		const timeoutId = setTimeout(
			() => pingApp(pingOpts),
			hubInstance.HEARTBEAT
		);

		appPongs.set(token, {
			lastPong: window.performance.now(),
			timeoutIds: new Set([timeoutId])
		});
	}

	function handleSpawn(event) {
		const message = event.data;
		debug('Spawning %o from %o - %O', message.target, message.source, message);
		try {
			const appId = call(
				'spawn',
				Object.values({
					app: message.target,
					parent: message.source
				})
			);
			appSpawns.push({ appId, message });
		} catch (e) {
			postMessage({
				type: 'SPAWN-FAIL',
				source: CHROME_APP_ID,
				target: message.source,
				token: appWindows.get(windowByApp(CHROME_APP_ID)).token,
				topic: message.topic,
				data: message.target + " is not activated on the current user's account"
			});
		}
	}

	function handlePong(token) {
		appPongs.set(token, {
			...appPongs.get(token),
			lastPong: window.performance.now()
		});
	}

	function handleEvent(event) {
		const message = event.data;
		/**
		 * @TODO Handle the case when the Chrome blocks certain targets for certain sources
		 */
		const targetWindow = windowByApp(message.target, event.source);
		debug(
			'Routing %o from %o to %o - %O',
			message.type,
			message.source,
			message.target,
			message
		);
		postMessage(message, targetWindow);

		if (message.type.indexOf('SPAWN') === 0) {
			call(
				'spawn.submit',
				Object.values({
					app: message.source,
					parent: message.target,
					data: message.data
				})
			);
		}
	}

	window.addEventListener('message', function(event) {
		const message = event.data;
		const appWindow = appWindows.get(event.source);
		const token = (message.token = appWindow.token);
		message.source = appWindow.appId;
		message.viaHub = true;

		// Only accept valid messages from apps.
		if (!hubMessageValid(message)) {
			return;
		}

		// Message from a frame we don't know yet.
		// The only command should be CONNECT, we fail otherwise.
		if (!appWindows.has(event.source) && message.type !== 'CONNECT') {
			console.warn(
				'Unexpected critical error! app sent message without being connected!',
				event
			);
			return;
		}

		if (message.token !== appWindows.get(event.source).token) {
			console.warn(
				'Token seems invalid, discarding message!\n' +
					JSON.stringify(message, null, 2)
			);
			return;
		}

		if (message.source === message.target) {
			console.warn(
				'Source and destination match, discarding message!\n' +
					JSON.stringify(message, null, 2)
			);
			return;
		}

		switch (message.type) {
			case 'CONNECT': {
				// Message from a frame we don't know yet.
				if (!appWindows.has(event.source)) {
					handleAppConnect(event);
				} else {
					console.warn('Already connected app trying to reconnect!', event);
				}

				break;
			}
			case 'EVENT':
			case 'SPAWN-SUCCESS':
			case 'SPAWN-FAIL': {
				if (!complexMessageValid(message)) {
					console.warn(
						'Message incomplete for a %s command!\n%O',
						message.type,
						JSON.stringify(message)
					);
					return;
				}
				handleEvent(event);
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

				handleSpawn(event);
				break;
			}
			case 'PONG':
				handlePong(token);
				break;
			default:
				debug('* %o', event.data);
				break;
		}
	});

	app();

	hubInstance = {
		top: app,
		add,
		call,
		HEARTBEAT: hubInstance.HEARTBEAT
	};
	return hubInstance;
}
