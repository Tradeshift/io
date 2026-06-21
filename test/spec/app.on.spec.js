import { CHROME_APP } from '../lib/constants';
import {
	sendCommand,
	verifyTestMessage,
	removeAppOrFail,
	delay,
	inBrowserstack
} from '../lib/helpers';
import { windowMapper } from '../lib/hub-mock';

export default ({ apps, topApp }) => {
	it('app.once() [on() + off()]', (done) => {
		let connectCount = 0;
		const connectListener = async (event) => {
			const testMessage = event.data;
			if (!verifyTestMessage(testMessage, event.source)) {
				return;
			}
			if (testMessage.io.method === 'connect') {
				const command = {
					command: 'emit',
					topic: windowMapper.appByWindow(event.source),
					target: CHROME_APP,
					data: ''
				};
				await delay(() => {
					sendCommand(event.source, command);
					sendCommand(event.source, command);
				});
				if (++connectCount === 4) {
					window.removeEventListener('message', connectListener);
				}
			}
		};
		window.addEventListener('message', connectListener);

		const messageHandler = (message) => {
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
		const topHandler = (msg) => {
			if (++messageCount === 8) {
				topApp.off('*', topHandler);
				if (!inBrowserstack()) {
					console.log('DONE - app.once() [on() + off()]');
				}
				done();
			}
		};
		topApp.on('*', topHandler);
	});
};
