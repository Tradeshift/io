const BROADCAST_PREFIX = 'app-broadcast:';

/**
 * Broadcast Message to one or more apps.
 * @param {array|string} appIds List of apps to receive the message, supports glob
 * Examples:
 * * ['Tradeshift.Developer', 'Tradeshift.DeveloperDemo'] (matches Tradeshift.Developer and Tradeshift.DeveloperDemo)
 * * 'Tradeshift.Developer' (matches Tradeshift.Developer)
 * * '*' (matches any app)
 * * 'Tradeshift.*' (matches all Tradeshift apps)
 * * 'Tradeshift.??Y' (matches Tradeshift.Buy, Tradeshift.Pay, etc.)
 * @param {string} key The key/subject of the event
 * @param {object} data Data to be sent with the event
 */
export function broadcast(appIds, key, data) {
	if (!Array.isArray(appIds)) {
		appIds = [appIds];
	}
	const content = stringify(appIds, key, data);
	if (
		appIds.indexOf('Tradeshift.Chrome') !== -1 ||
		window.top !== window.self
	) {
		window.top.postMessage(content, '*');
	}
}

/**
 * Subscribe to messages from one or more apps.
 * @param {array|string} appIds List of apps to receive the message, supports glob
 * @return {Listener} Listener object
 */
export function subscribe(appIds) {
	return new Listener(appIds);
}

/**
 * Message listener for one or more apps.
 */
class Listener {
	constructor(appIds) {
		/**
		 * The map of the events
		 */
		this.events = new Map();
		this.appIds = appIds;
	}

	/**
	 * Listen to message and call handler.
	 * @param {string} key The key/subject of the event.
	 * @param {function} callback The handler of the event.
	 * @return {Listener} Listener object
	 */
	on(key, callback) {
		if (!key || !callback) {
			console.warn('We need two parameters key and callback');
			return this;
		}
		if (this.events.has(key)) {
			this.off(key);
			return this;
		}
		const handler = e => {
			if (
				typeof e.data !== 'string' ||
				!e.data.includes(BROADCAST_PREFIX) ||
				!e.data.includes(key)
			) {
				return this;
			}
			const data = JSON.parse(e.data.replace(BROADCAST_PREFIX, ''));
			// Not enough data to handle
			if (!data.appIds || !data.key) {
				return this;
			}
			// This is not the key we need
			if (data.key !== key) {
				return this;
			}

			// Did we get appIds as a string?
			const isString = typeof data.appIds === 'string';
			// Did we get appIds as an Array?
			const isArray = Array.isArray(data.appIds);
			// We got something else, do not handle
			if (!(isString ^ isArray)) {
				return this;
			}
			// Convert appIds to Array
			const appIds = isString ? [data.appIds] : data.appIds;

			// We match any app
			const hasAnyApp = this.appIds === '*';
			// We match a single app (string)
			const hasStrApp =
				this.appIds === 'string' && appIds.indexOf(this.appIds) !== -1;
			// We match a multiple apps (Array)
			const hasArrApp =
				Array.isArray(this.appIds) &&
				this.appIds.every(a => appIds.indexOf(a) !== -1);

			// If we don't match '*', we should match as a string or array
			if (!hasAnyApp || (!hasStrApp || !hasArrApp)) {
				return this;
			}

			if (callback) {
				callback(data.data);
			}
		};
		window.addEventListener('message', handler);
		this.events.set(key, handler);
		return this;
	}

	/**
	 * Stop listen to message.
	 * @param {string} key The key/subject of the event.
	 * @return {Listener} Listener object
	 */
	off(key) {
		if (!key) {
			console.warn('We need the parameter of key');
			return this;
		}
		if (this.events.has(key)) {
			const handler = this.events.get(key);
			window.removeEventListener('message', handler);
			this.events.delete(key);
		}
		return this;
	}

	/**
	 * Temporarily stop receiving events, but keep all handlers.
	 * @param {string} key The key/subject of the event.
	 * @return {Listener} Listener object
	 */
	pause(key) {
		if (!key) {
			console.warn('We need the parameter of key');
			return this;
		}
		if (!this.events.has(key)) {
			console.warn(`Can\'t find the message of ${key}`);
			return this;
		}
		const handler = this.events.get(key);
		window.removeEventListener('message', handler);
		return this;
	}

	/**
	 * Resume a listener after a pause().
	 * @param {string} key The key/subject of the event.
	 * @return {Listener} Listener object
	 */
	resume(key) {
		if (!key) {
			console.warn('We need the parameter of key');
			return this;
		}
		if (!this.events.has(key)) {
			console.warn(`Can\'t find the message of ${key}`);
			return this;
		}
		const handler = this.events.get(key);
		window.addEventListener('message', handler);
		return this;
	}

	/**
	 * Stop listening to all registered handlers.
	 */
	clear() {
		for (let key of this.events.keys()) {
			this.off(key);
		}
		return this;
	}
}

// Private .................................................................

/**
 * Encode broadcast to be posted.
 * @param {array|string} appIds List of apps to receive the message, supports glob
 * @param {string} key The key/subject of the event
 * @param {object} data Data to be sent with the event
 * @return {string} message
 */
const stringify = (appIds, key, data) => {
	const prefix = BROADCAST_PREFIX;
	let content = {};
	content.appIds = appIds || '';
	content.key = key || '';
	content.data = data || {};
	let subfix = '';
	try {
		subfix = JSON.stringify(content);
	} catch (e) {
		console.warn(e);
	}
	return prefix + subfix;
};
