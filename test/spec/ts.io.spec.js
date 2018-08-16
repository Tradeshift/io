import {
	CHROME_APP,
	NOT_FOUND_APP,
	TOPIC_BEFORE_CONNECT,
	TOPIC_AFTER_CONNECT
} from '../lib/constants';
import {
	sendCommand,
	verifyTestMessage,
	removeAppOrFail,
	delay
} from '../lib/helpers';
import { getHub, createApp, killAllApps, windowMapper } from '../lib/hub-mock';

let hub, topApp;
try {
	describe('ts.io', () => {
		let apps;

		beforeAll(() => {
			try {
				hub = getHub();
				hub.HEARTBEAT = 300;
				hub.add('spawn', (app, parent) => {
					if (app === NOT_FOUND_APP) {
						throw new Error('App does not exist.');
					}
					createApp(app, { sandbox: true, crossdomain: true });
					return app;
				});
				topApp = hub.top();
			} catch (e) {
				console.log('init error', e);
			}
		});

		beforeEach(done => {
			apps = [
				'Tradeshift.Unsecure',
				'Tradeshift.Sandbox',
				'Tradeshift.Crossdomain',
				'Tradeshift.SandboxCrossdomain'
			];
			createApp(apps[0]);
			createApp(apps[1], { sandbox: true });
			createApp(apps[2], { crossdomain: true });
			createApp(apps[3], {
				sandbox: true,
				crossdomain: true
			});
			setTimeout(done, 0);
		});
		afterEach(done => {
			killAllApps();

			function noFramesLeft() {
				if (window.document.getElementsByTagName('iframe').length) {
					setTimeout(noFramesLeft, 0);
				} else {
					done();
				}
			}
			setTimeout(noFramesLeft, 0);
		});

		it('app.emit() before CONNECT', done => {
			let messageCount = 0;
			const beforeConnectHandler = message => {
				expect(message.topic).toEqual(TOPIC_BEFORE_CONNECT);
				expect(message.target).toEqual(CHROME_APP);
				expect(apps.includes(message.source)).toBeTruthy();
				if (++messageCount === 4) {
					topApp.off(TOPIC_BEFORE_CONNECT, beforeConnectHandler);
					done();
				}
			};
			topApp.on(TOPIC_BEFORE_CONNECT, beforeConnectHandler);
		});

		it('app.emit() after CONNECT', done => {
			let connectCount = 0;
			const connectListener = event => {
				const message = event.data;
				if (!verifyTestMessage(message, event.source)) {
					return;
				}
				if (message.data.method === 'connect') {
					delay(() =>
						sendCommand(event.source, {
							command: 'emit',
							topic: TOPIC_AFTER_CONNECT,
							target: CHROME_APP
						})
					);
					if (++connectCount === 4) {
						window.removeEventListener('message', connectListener);
					}
				}
			};
			window.addEventListener('message', connectListener);

			const afterConnectHandler = message => {
				expect(message.topic).toEqual(TOPIC_AFTER_CONNECT);
				expect(message.target).toEqual(CHROME_APP);
				if (++messageCount === 4) {
					topApp.off(TOPIC_AFTER_CONNECT, afterConnectHandler);
					done();
				}
			};
			let messageCount = 0;
			topApp.on(TOPIC_AFTER_CONNECT, afterConnectHandler);
		});

		it('app.once() [on() + off()]', done => {
			let connectCount = 0;
			const connectListener = event => {
				const message = event.data;
				if (!verifyTestMessage(message, event.source)) {
					return;
				}
				if (message.data.method === 'connect') {
					const command = {
						command: 'emit',
						topic: windowMapper.appByWindow(event.source),
						target: CHROME_APP
					};
					delay(() => {
						sendCommand(event.source, command);
						sendCommand(event.source, command);
					});
					if (++connectCount === 4) {
						window.removeEventListener('message', connectListener);
					}
				}
			};
			window.addEventListener('message', connectListener);

			const messageHandler = message => {
				removeAppOrFail(
					message.source,
					apps,
					'Message handled by once(), more than once!'
				);

				expect(message.topic).toEqual(message.source);
				expect(message.target).toEqual(CHROME_APP);
			};

			topApp.once(apps[0], messageHandler);
			topApp.once(apps[1], messageHandler);
			topApp.once(apps[2], messageHandler);
			topApp.once(apps[3], messageHandler);

			let messageCount = 0;
			const topHandler = msg => {
				if (++messageCount === 12) {
					topApp.off('*', topHandler);
					done();
				}
			};
			topApp.on('*', topHandler);
		});

		it("hub.add('timeout')", done => {
			let connectCount = 0;
			const connectListener = event => {
				const message = event.data;
				if (!verifyTestMessage(message, event.source)) {
					return;
				}
				if (message.data.method === 'connect' && ++connectCount === 4) {
					const frames = window.document.getElementsByTagName('iframe');
					expect(frames.length).toEqual(4);
					for (let i = frames.length - 1; i >= 0; i--) {
						const frame = frames[i];
						try {
							if (frame && frame.parentNode) {
								frame.parentNode.removeChild(frame);
							}
						} catch (e) {
							console.log('removeChild error', e);
						}
					}
					window.removeEventListener('message', connectListener);
				}
			};
			window.addEventListener('message', connectListener);

			let timeoutCount = 0;
			hub.add('timeout', (win, app) => {
				removeAppOrFail(
					app,
					apps,
					'App timeout() called more than once for the same app!'
				);

				if (++timeoutCount === 4) {
					hub.add('timeout', () => {});
					done();
				}
			});
		});

		it('app.spawn() > App not found', done => {
			let connectCount = 0;
			const connectListener = event => {
				const message = event.data;
				if (!verifyTestMessage(message, event.source)) {
					return;
				}
				if (message.data.method === 'connect') {
					const command = {
						command: 'call',
						method: 'spawn',
						target: NOT_FOUND_APP
					};
					delay(() => sendCommand(event.source, command));
					if (++connectCount === 4) {
						window.removeEventListener('message', connectListener);
					}
				}
			};
			window.addEventListener('message', connectListener);

			let spawnCount = 0;
			const spawnListener = event => {
				const message = event.data;
				if (!verifyTestMessage(message, event.source)) {
					return;
				}
				if (message.data.method === 'call') {
					expect(message.data.err).toContain(NOT_FOUND_APP);
					expect(message.data.data).toBeNull();
					if (++spawnCount === 4) {
						window.removeEventListener('message', spawnListener);
						done();
					}
				}
			};

			window.addEventListener('message', spawnListener);
		});
	});
} catch (e) {
	console.error('ERROR', e);
}
