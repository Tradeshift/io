/**
 * Are we in the same frame as the Tradeshift® Chrome™?
 * @return {boolean}
 */
export function isChromeWindow() {
	return window.ts && window.ts.chrome !== undefined;
}

/**
 * Heartbeat regularity in ms.
 * @type {number}
 */
export const HEARTBEAT = 5000;

/**
 * Harcoded appId for the Tradeshift® Chrome™
 * @type {string}
 */
export const CHROME_APP_ID = 'Tradeshift.Chrome';
