const isWindow = (win) => win && win.postMessage;

export const verifyTestMessage = (message, source) =>
	source && message && message.io;

export const forwardMessage = (msg) =>
	window.top.postMessage(
		{
			io: {
				...msg
			}
		},
		'*'
	);

export const sendCommand = (win, command) => {
	if (isWindow(win)) {
		win.postMessage(
			{
				io: {
					...command
				}
			},
			'*'
		);
	}
};

export const removeAppOrFail = (app, apps, message) => {
	const idxToRemove = apps.indexOf(app);
	if (idxToRemove !== -1) {
		apps.splice(idxToRemove, 1);
	} else {
		fail(message);
	}
};

export const delay = (cb, timeout = 0) =>
	new Promise((resolve) => {
		setTimeout(() => {
			cb();
			resolve();
		}, timeout);
	});

export const inBrowserstack = () => window.BrowserStack !== undefined;
