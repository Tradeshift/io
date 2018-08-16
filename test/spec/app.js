import { forwardMessage } from '../lib/helpers';
import { CHROME_APP, TOPIC_BEFORE_CONNECT } from '../lib/constants';

let app;

window.addEventListener('message', event => {
	const message = event.data;
	if (!message || !message.command || message.ioTest === undefined) {
		return;
	}
	switch (message.command) {
		case 'emit':
			if (app.emit) {
				app.emit(message.topic, message.target, message.data);
			}
			break;
		case 'call':
			if (app.call) {
				let err, data;
				try {
					app
						.call(message.method, message.target, message.data)
						.then(([_err, _data]) => {
							err = _err;
							data = _data;
							forwardMessage({ method: 'call', err, data });
						});
				} catch (e) {
					forwardMessage({ method: 'error', e, err, data });
				}
			}
			break;
		case 'destroy':
			app = null;
			break;
	}
});

app = ts.io();

app.emit(TOPIC_BEFORE_CONNECT, CHROME_APP);

app.on('*', forwardMessage);

app.add('spawn', (data, submit, parent) => {
	forwardMessage({ method: 'spawn', data, submit, parent });
	setTimeout(() => {
		submit(data);
	}, 0);
});
app.add('connect', () => {
	forwardMessage({ method: 'connect' });
});
