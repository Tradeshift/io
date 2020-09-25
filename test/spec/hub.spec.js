import { verifyTestMessage, removeAppOrFail } from '../lib/helpers';

export default ({ apps, hub }) => {
	describe('hub', () => {
		let onMessage;
		const eventListener = evt => {
			if (onMessage) {
				onMessage(evt);
			}
		};
		const waitForMethod = method =>
			new Promise(resolve => {
				onMessage = event => {
					const testMessage = event.data;
					if (!verifyTestMessage(testMessage, event.source)) {
						return;
					}
					if (testMessage.io.method === method) {
						resolve();
					}
				};
			});

		beforeEach(() => {
			window.addEventListener('message', eventListener);
		});
		afterEach(() => {
			window.removeEventListener('message', eventListener);
		});

		it('#handleAppTimeout gets called for all 4 apps', async done => {
			// Await frames
			await waitForMethod('connect');
			await waitForMethod('connect');
			await waitForMethod('connect');
			await waitForMethod('connect');

			const frames = window.document.getElementsByTagName('iframe');
			expect(frames.length).toEqual(4);
			// remove frames to force timeout
			for (let i = frames.length - 1; i >= 0; i--) {
				const frame = frames[i];
				if (frame && frame.parentNode) {
					frame.parentNode.removeChild(frame);
				}
			}

			hub._fakeTimeout = app => {
				removeAppOrFail(
					app,
					apps,
					'App timeout() called more than once for the same app!'
				);

				if (!apps.length) {
					done();
				}
			};
		}, 5000);
	});
};
