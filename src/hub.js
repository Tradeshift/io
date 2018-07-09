import uuid from 'uuid';
import { log } from './log';
import { app } from './app';
import { postMessage, hubMessageValid, publishMessageValid } from './msg';
import { HEARTBEAT } from './lib';

export function hub(chrome) {
	const debug = log('ts:app:top');
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
				const appId = chrome.appIdByWindow(event.source);
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
		const appId = (message.source = appWindow.appId);
		const token = (message.token = appWindow.token);
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
				const targetWindow = chrome.windowByAppId(message.target, event.source);
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

	return {
		top: app
	};
}
