import { BROADCAST_PREFIX } from './constants';
import stringify from './stringify';
export { broadcast } from './ts.app.broadcast';


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
			let content = JSON.parse(e.data.replace(BROADCAST_PREFIX, ''));
			if (content.key !== key || (this.appIds !== '*' && content.appIds !== this.appIds)) {
				return this;
			}
			if (callback) {
				callback(content.data);
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
