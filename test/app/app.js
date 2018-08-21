import { forwardMessage } from '../lib/helpers';
import { CHROME_APP, TOPIC_BEFORE_CONNECT } from '../lib/constants';

let app;

window.addEventListener('message', event => {
	const testMessage = event.data;
	if (!testMessage || testMessage.io === undefined) {
		return;
	}
	switch (testMessage.io.command) {
		case 'emit':
			if (app.emit) {
				app.emit(
					testMessage.io.topic,
					testMessage.io.data,
					testMessage.io.target
				);
			}
			break;
		case 'spawn':
			if (app.spawn) {
				let err, data;
				try {
					app
						.spawn(testMessage.io.target, testMessage.io.data)
						.then(([_err, _data]) => {
							err = _err;
							data = _data;
							forwardMessage({ method: 'spawn', err, data });
						});
				} catch (e) {
					forwardMessage({ method: 'spawn-error', e, err, data });
				}
			}
			break;
		case 'destroy':
			app = null;
			break;
	}
});

app = ts.io();
app.define({
	connect() {
		forwardMessage({ method: 'connect' });
	},
	spawn(data, submit, parent) {
		forwardMessage({ method: 'spawned', data, submit, parent });
		setTimeout(() => {
			submit(data);
		}, 0);
	}
});

app.emit(TOPIC_BEFORE_CONNECT, CHROME_APP);

app.on('*', forwardMessage);
