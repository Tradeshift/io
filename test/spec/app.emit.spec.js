import {
	CHROME_APP,
	TOPIC_BEFORE_CONNECT,
	TOPIC_AFTER_CONNECT
} from '../lib/constants';
import {
	sendCommand,
	verifyTestMessage,
	delay,
	inBrowserstack
} from '../lib/helpers';

export default ({ apps, topApp }) => {
	it('app.emit() before CONNECT', done => {
		let messageCount = 0;
		const beforeConnectHandler = message => {
			expect(message.topic).toEqual(TOPIC_BEFORE_CONNECT);
			expect(message.target).toEqual(CHROME_APP);
			expect(apps.includes(message.source)).toBeTruthy();
			expect(++messageCount).toBeLessThanOrEqual(4);
			if (messageCount === 4) {
				topApp.off(TOPIC_BEFORE_CONNECT, beforeConnectHandler);
				if (!inBrowserstack()) {
					console.log('DONE - app.emit() before CONNECT');
				}
				done();
			}
		};
		topApp.on(TOPIC_BEFORE_CONNECT, beforeConnectHandler);
	});

	it.skip('app.emit() after CONNECT', done => {
		let connectCount = 0;
		const connectListener = event => {
			const testMessage = event.data;
			if (!verifyTestMessage(testMessage, event.source)) {
				return;
			}
			if (testMessage.io.method === 'connect') {
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
				if (!inBrowserstack()) {
					console.log('DONE - app.emit() after CONNECT');
				}
				done();
			}
		};
		let messageCount = 0;
		topApp.on(TOPIC_AFTER_CONNECT, afterConnectHandler);
	});
};
