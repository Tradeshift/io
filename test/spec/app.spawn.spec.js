import { NOT_FOUND_APP } from '../lib/constants';
import {
	sendCommand,
	delay,
	verifyTestMessage,
	inBrowserstack
} from '../lib/helpers';

export default () => {
	it('app.spawn() > App not found', (done) => {
		let connectCount = 0;
		let spawnCount = 0;
		const spawnListener = async (event) => {
			const testMessage = event.data;
			if (!verifyTestMessage(testMessage, event.source)) {
				return;
			}
			if (testMessage.io.method === 'connect') {
				const command = {
					command: 'spawn',
					target: NOT_FOUND_APP
				};
				await delay(() => sendCommand(event.source, command));
				expect(++connectCount).toBeLessThanOrEqual(4);
			} else if (testMessage.io.method === 'spawn') {
				expect(testMessage.io.err).toContain(NOT_FOUND_APP);
				expect(testMessage.io.data).toBeNull();
				expect(++spawnCount).toBeLessThanOrEqual(4);
				if (spawnCount === 4) {
					window.removeEventListener('message', spawnListener);
					if (!inBrowserstack()) {
						console.log('DONE - app.spawn() > App not found');
					}
					done();
				}
			}
		};

		window.addEventListener('message', spawnListener);
	});
};
