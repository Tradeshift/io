import * as uuid from 'uuid';
import { app } from './app';
import { CHROME_APP_ID, HEARTBEAT as _HEARTBEAT } from './lib';
import { log } from './log';
import { complexMessageValid, hubMessageValid, IoMessage, IoMessageType, postMessage } from './msg';
import { AppPing, AppPongs, AppSpawn, AppWindows, ConnackData, HubInstance } from './types';

let hubInstance: HubInstance;

/**
 * WeakMap of frames with apps.
 * @type {WeakMap<Window, Object<appId: string, token: string>}
 */

const appWindows = new WeakMap<Window, AppWindows>();
/**
 * Map of when the last PONG, or any other message was sent from an app.
 * @type {Map<token: string, Object<lastPong: DOMHighResTimeStamp, timeoutIds: Set<timeoutId: number>}
 */

const appPongs = new Map<string, AppPongs>();

const appSpawns: AppSpawn[] = [];

/**
 * Special features supplied by the Tradeshift® Chrome™.
 * @typedef {object} ChromeWindowFeatures
 * @property {function(Window): string} appByWindow Called to get an appId based on a Window object.
 * @property {function(string, Window): Window} windowByApp Called to get a window object based on an appId and the requesting app's Window object.
 */

function invalidFunction(name: string) {
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
	const debug = log('ts:io:top');

	hubInstance = { HEARTBEAT: _HEARTBEAT };

	const {
		appByWindow = invalidFunction('appByWindow'),
		windowByApp = invalidFunction('windowByApp'),
		handleAppSpawn = invalidFunction('handleAppSpawn'),
		handleAppSubmit = invalidFunction('handleAppSubmit'),
		handleAppTimeout = invalidFunction('handleAppTimeout')
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

	function forgetApp(targetWindow: Window): void {
		try {
			const appWindow = appWindows.get(targetWindow);
			const appId = appWindow ? appWindow.appId : undefined;
			const token = appWindow ? appWindow.token : undefined;

			if (appId && token) {
				debug('Forgetting app %o', appId);
				const pongs = appPongs.get(token);
				if (pongs) {
					pongs.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId))
					appPongs.delete(token);
				}

				appWindows.delete(targetWindow);
			}
		} catch (error) {
			debug("App couldn't be forgotten in %o - %o", targetWindow, error);
		}
	}

	/*
	1. after sending CONNACK to an app, PING it after HEARTBEAT ms
	2. if it replies, wait HEARTBEAT ms and PING again, - repeat forever
	3. if it doesn't reply within 4 * HEARTBEAT ms, consider the client dead and remove it from the list while removing all traces of it
	*/
	function pingApp(opts: AppPing): void {
		const { appId, token, targetWindow } = opts;

		const now = window.performance.now();
		const appPongInfo = appPongs.get(token);
		const lastPong = (appPongInfo && appPongInfo.lastPong) || now;
		let appAlive = now - lastPong < 3 * hubInstance.HEARTBEAT;
		if (appAlive && appPongInfo) {
			appPongInfo.timeoutIds.add(
				window.setTimeout(() => pingApp(opts), hubInstance.HEARTBEAT)
			);
			try {
				const msg = new IoMessage(IoMessageType.PING);
				msg.viaHub = true;
				msg.target = appId;
				msg.token = token;
				postMessage(msg, targetWindow);
			} catch (error) {
				appAlive = false;
			}
		}
		if (!appAlive) {
			debug('App timed out, considering it dead! %o', appId);
			handleAppTimeout(appId, targetWindow);
			try {
				forgetApp(targetWindow);
			} catch (error) {
				console.warn(
					"App couldn't be killed.\n" + JSON.stringify(error, null, 2)
				);
			}
		}
	}

	function handleAppConnect(data: MessageEvent): void {
		const sourceWindow = data.source as Window;

		if (!sourceWindow) {
			return;
		}

		const appId = appByWindow(sourceWindow);
		const token = uuid();
		const spawnWaiting = appSpawns.findIndex(spawn => spawn.appId === appId);
		const connackMessage = new IoMessage(IoMessageType.CONNACK);
		connackMessage.viaHub = true;
		connackMessage.target = appId;
		connackMessage.token = token;

		appWindows.set(sourceWindow, { appId, token });

		debug('CONNECT %o', appId);

		if (spawnWaiting !== -1) {
			const { data, source } = appSpawns[spawnWaiting].message;
			connackMessage.source = source;
			connackMessage.data = data;
			appSpawns.splice(spawnWaiting, 1);
		}

		postMessage(connackMessage, sourceWindow);

		if (appId !== CHROME_APP_ID) {
			const timeoutId = window.setTimeout(() => pingApp({ targetWindow: sourceWindow, appId, token }), hubInstance.HEARTBEAT);

			appPongs.set(token, {
				lastPong: window.performance.now(),
				timeoutIds: new Set<number>([timeoutId])
			});
		}
	}

	function handleSpawn(data: MessageEvent) {
		const message = data.data;
		debug('Spawning %o from %o - %O', message.target, message.source, message);
		try {
			const appId = handleAppSpawn(message.target, message.source);
			appSpawns.push({ appId, message });
		} catch (e) {
			const msg = new IoMessage(IoMessageType.SPAWN_FAIL);
			msg.target = message.source;
			msg.topic = message.topic;
			msg.data = `${message.target} is not activated on the current user's account`;
			msg.viaHub = true;

			postMessage(msg, windowByApp(message.source, CHROME_APP_ID));
		}
	}

	function handlePong(event) {
		const token = event.data.token;
		const pongs = appPongs.get(token);
		if (pongs) {
			pongs.lastPong = window.performance.now();
			appPongs.set(token, pongs);
		} else {
			appPongs.set(token, {
				timeoutIds: new Set<number>(),
				lastPong: window.performance.now()
			});
		}
	}

	function handleEvent(data: MessageEvent): void {
		const message = data.data;
		const sourceWindow = data.source;
		/**
		 * @TODO Handle the case when the Chrome blocks certain targets for certain sources
		 */
		const targetWindow = windowByApp(message.target, sourceWindow);
		debug(
			'Routing %o from %o to %o - %O',
			message.type,
			message.source,
			message.target,
			message
		);
		postMessage(message, targetWindow);

		if (message.type.indexOf('SPAWN') === 0) {
			handleAppSubmit(message.source, message.target, message.data);
		}
	}

	window.addEventListener('message', function(event: MessageEvent) {
		const message = event.data;

		// Only accept valid messages from apps.
		if (!hubMessageValid(message)) {
			return;
		}

		if (!event.source) {
			return;
		}

		const appWindow = appWindows.get(event.source as Window);
		message.source = appWindow && appWindow.appId;
		message.viaHub = true;

		// Message from a frame we don't know yet.
		// The only command should be CONNECT, we fail otherwise.
		if (!appWindow && message.type !== IoMessageType.CONNECT) {
			console.warn(
				'Unexpected critical error! App sent message without being connected!\n' +
					JSON.stringify(message, null, 2)
			);
			return;
		}

		if (appWindow && message.token !== appWindow.token) {
			console.warn(
				'Token invalid, discarding message!\n' +
					JSON.stringify(message, null, 2)
			);
			return;
		}

		if (message.source && message.source === message.target) {
			console.warn(
				'Source and destination match, discarding message!\n' +
					JSON.stringify(message, null, 2)
			);
			return;
		}

		switch (message.type) {
			case IoMessageType.CONNECT:
				// Message from a frame we don't know yet.
				if (appWindow && Object.keys(appWindow).length) {
					console.warn(
						'CONNECT received from known app, discarding message!\n' +
							JSON.stringify(message, null, 2)
					);
					return;
				}
				return handleAppConnect(event);

			case IoMessageType.EVENT:
			case IoMessageType.SPAWN_SUCCESS:
			case IoMessageType.SPAWN_FAIL:
				if (!complexMessageValid(message)) {
					console.warn(
						`Message incomplete for a ${message.type} command!\n` +
							JSON.stringify(message, null, 2)
					);
					return;
				}
				return handleEvent(event);

			case IoMessageType.SPAWN:
				if (!complexMessageValid(message)) {
					console.warn(
						'Message incomplete for a SPAWN command!\n' +
							JSON.stringify(message, null, 2)
					);
					return;
				}
				return handleSpawn(event);

			case IoMessageType.PONG:
				return handlePong(event);
			default:
				debug('* %o', event.data);
		}
	});

	app();

	hubInstance = {
		top: app,
		forgetApp,
		HEARTBEAT: hubInstance.HEARTBEAT
	};
	return hubInstance;
}
