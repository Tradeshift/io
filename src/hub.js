import uuid from 'uuid';
import { log } from './log';
import { app } from './app';
import { postMessage, hubMessageValid, publishMessageValid } from './msg';
import { HEARTBEAT, CHROME_APP_ID } from './lib';

let hubInstance;

/**
 * Special features supplied by the Tradeshift® Chrome™.
 * @typedef {object} ChromeWindowFeatures
 * @property {function(Window): string} appIdByWindow Called to get an appId based on a Window object.
 * @property {function(string, Window): Window} windowByAppId Called to get a window object based on an appId and the requesting app's Window object.
 * @property {function(Window): void} appTimeout Called when an app fails to reply in time to a PING request.
 */

/**
 * The Message Broker AKA The Hub.
 * @param {ChromeWindowFeatures} chrome Special features supplied by the Tradeshift® Chrome™
 */
export function hub({ appIdByWindow, windowByAppId, appTimeout }) {
	if (hubInstance) {
		return hubInstance;
	}

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
			appPongInfo.timeoutIds.add(setTimeout(() => pingApp(opts), HEARTBEAT));
			postMessage(
				{ type: 'PING', viaHub: true, target: appId, token },
				targetWindow
			);
		} else {
			debug('App timed out, considering it dead! %o', appId);
			try {
				appTimeout(targetWindow);
				appWindows.delete(targetWindow);
				appPongInfo.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
				appPongs.delete(token);
			} catch (error) {
				console.error(error);
			}
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
				postMessage(
					{ type: 'CONNACK', viaHub: true, target: appId, token },
					event.source
				);
				const pingOpts = { targetWindow: event.source, appId, token };
				const timeoutId = setTimeout(() => pingApp(pingOpts), HEARTBEAT);
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
				if (!publishMessageValid(message)) {
					console.warn(
						'Message incomplete for a PUBLISH command!\n' +
							JSON.stringify(message)
					);
					return;
				}
				/**
				 * @TODO Handle the case when the Chrome blocks certain targets for certain sources
				 */
				const targetWindow = windowByAppId(message.target, event.source);
				debug(
					'Routing %o from %o to %o - %O',
					'PUBLISH',
					message.source,
					message.target,
					message
				);
				postMessage(message, targetWindow);
				break;
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
		top: app
	};
	return hubInstance;
}
