import {
	verifyTestMessage,
	removeAppOrFail,
	inBrowserstack
} from '../lib/helpers';

export default ({ apps, hub }) => {
	it('hub > handleAppTimeout', done => {
		let connectCount = 0;
		const connectListener = event => {
			const testMessage = event.data;
			if (!verifyTestMessage(testMessage, event.source)) {
				return;
			}
			if (testMessage.io.method === 'connect' && ++connectCount === 4) {
				const frames = window.document.getElementsByTagName('iframe');
				expect(frames.length).toEqual(4);
				for (let i = frames.length - 1; i >= 0; i--) {
					const frame = frames[i];
					try {
						if (frame && frame.parentNode) {
							frame.parentNode.removeChild(frame);
						}
					} catch (e) {
						console.log(
							'[hub > handleAppTimeout] removeChild failed.\n' +
								JSON.stringify(e, null, 2)
						);
					}
				}
				window.removeEventListener('message', connectListener);
			}
		};
		window.addEventListener('message', connectListener);

		let timeoutCount = 0;
		hub._fakeTimeout = (app, win) => {
			removeAppOrFail(
				app,
				apps,
				'App timeout() called more than once for the same app!'
			);

			if (++timeoutCount === 4) {
				hub._fakeTimeout = () => {};
				if (!inBrowserstack()) {
					console.log('DONE - hub > handleAppTimeout');
				}
				done();
			}
		};
	});
};
