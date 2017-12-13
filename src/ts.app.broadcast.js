import stringify from './stringify';

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
	const content = stringify(appIds, key, data);
	if (window.name === 'Tradeshift.Chrome' || window.top !== window.self) {
		window.top.postMessage(content, '*');
	}
}