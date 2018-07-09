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
