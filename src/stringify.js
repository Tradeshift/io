import { BROADCAST_PREFIX } from './constants';

/**
 * Encode broadcast to be posted.
 * @param {array|string} appIds List of apps to receive the message, supports glob
 * @param {string} key The key/subject of the event
 * @param {object} data Data to be sent with the event
 * @return {string} message
 */
export default (appIds, key, data) => {
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