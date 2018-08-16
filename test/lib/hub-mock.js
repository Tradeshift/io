import { CHROME_APP, BASE_URL, BASE_XD_URL } from './constants';

const apps = [];

let hub;

export const windowMapper = {
	appByWindow(win) {
		if (win === window.top) {
			return CHROME_APP;
		}

		if (apps.length) {
			const frames = window.frames;
			for (let i = 0; i < frames.length; i++) {
				if (win === frames[i]) {
					return apps[i];
				}
			}
		}

		console.warn('App not found ', win);
		return null;
	},
	windowByApp(app, sourceWindow) {
		if (app === CHROME_APP) {
			return window.top;
		}

		if (apps.length) {
			try {
				return window.document.getElementById(app).contentWindow;
			} catch (error) {
				console.warn('%o is not a valid frame!', app, error);
			}
		}

		console.warn('Window not found ', app);
		return null;
	}
};

const createIframe = ({ id, src, sandbox, crossdomain }) => {
	const iframe = window.document.createElement('iframe');
	iframe.id = id;
	iframe.src = (crossdomain ? BASE_XD_URL : BASE_URL) + src;
	if (sandbox) {
		iframe.sandbox = 'allow-scripts allow-forms allow-same-origin';
	}
	window.document.body.appendChild(iframe);
	return iframe.contentWindow;
};

export const killAllApps = () => {
	apps.forEach(app => {
		let frame;
		try {
			frame = window.document.getElementById(app);
		} catch (e) {
			console.log('frame error', e);
		}
		if (frame) {
			try {
				if (frame.contentWindow) {
					hub.call('kill', [frame.contentWindow]);
				}
			} catch (e) {
				console.log('kill error', e);
			}

			try {
				if (frame.parentNode) {
					frame.parentNode.removeChild(frame);
				}
			} catch (e) {
				console.log('removeChild error', e);
			}
		}
	});
	apps.splice(0, apps.length);
};

export const createApp = (app, opts = {}, src = 'app.html') => {
	apps.push(app);
	return createIframe({
		id: app,
		src: src,
		...opts
	});
};

export const getHub = () => {
	try {
		hub = ts.io(windowMapper);
	} catch (e) {
		console.log('hub error', e);
	}
	return hub;
};
