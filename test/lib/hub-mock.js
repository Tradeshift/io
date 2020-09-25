import { CHROME_APP, NOT_FOUND_APP, BASE_URL, BASE_XD_URL } from './constants';
import { inBrowserstack } from './helpers';

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

		console.log('[windowMapper.appByWindow] App not found for Window.');
		return null;
	},
	windowByApp(app, sourceWindow) {
		if (app === CHROME_APP) {
			return window.top;
		}

		if (apps.length) {
			try {
				return window.document.getElementById(app).contentWindow;
			} catch (e) {}
		}

		console.log(`[windowMapper.windowByApp] Window not found for '${app}'.`);
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
			console.log(
				'[killAllApps] getElementById failed.\n' + JSON.stringify(e, null, 2)
			);
		}
		if (frame) {
			try {
				hub.forgetApp(app, frame.contentWindow);
			} catch (e) {
				console.log(
					'[killAllApps] frame.contentWindow OR hub.forgetApp failed.\n' +
						JSON.stringify(e, null, 2)
				);
			}

			try {
				if (frame.parentNode) {
					frame.parentNode.removeChild(frame);
				}
			} catch (e) {
				console.log(
					'[killAllApps] frame.parentNode.removeChild failed.\n' +
						JSON.stringify(e, null, 2)
				);
			}
		}
	});
	apps.splice(0, apps.length);
};

export const createApp = (app, opts = {}, src = 'app.html') => {
	if (!inBrowserstack()) {
		console.log(
			'Creating app "%s" (%s) @ %s',
			app,
			Object.keys(opts).join(', '),
			src
		);
	}
	apps.push(app);
	return createIframe({
		id: app,
		src: src,
		...opts
	});
};

export const getHub = () => {
	try {
		hub = ts.io({
			...windowMapper,
			handleAppSpawn(app, parent) {
				if (app === NOT_FOUND_APP) {
					throw new Error('App does not exist.');
				}
				createApp(app, { sandbox: true, crossdomain: true });
				return app;
			},
			handleAppSubmit() {},
			handleAppTimeout(app, win) {
				hub._fakeTimeout(app, win);
			}
		});
		hub._fakeTimeout = () => {};
	} catch (e) {
		console.log('[getHub] Hub failed.\n' + JSON.stringify(e, null, 2));
	}
	return hub;
};
