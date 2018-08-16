const isWindow = win => win && win.postMessage;

export const verifyTestMessage = (message, source) =>
	source && message && message.ioTest && message.data;

export const forwardMessage = msg =>
	window.top.postMessage(
		{
			ioTest: true,
			type: msg.topic,
			data: msg
		},
		'*'
	);

export const sendCommand = (win, command) => {
	if (isWindow(win)) {
		win.postMessage(
			{
				ioTest: true,
				...command
			},
			'*'
		);
	} else {
		console.error('win %o is not Window. Not sending command %o', win, command);
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

export const delay = cb => setTimeout(cb, 0);
