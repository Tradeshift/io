const colors = [
	// Red
	// 'hsl(0, 57%, 90%)',
	// 'hsl(0, 59%, 80%)',
	// 'hsl(0, 59%, 60%)',
	// 'hsl(0, 100%, 37%)',
	// 'hsl(0, 100%, 30%)',
	// 'hsl(0, 100%, 24%)',

	// Orange
	'hsl(32, 100%, 92%)',
	'hsl(33, 100%, 84%)',
	'hsl(33, 100%, 68%)',
	'hsl(33, 100%, 50%)',
	'hsl(31, 100%, 47%)',
	'hsl(26, 100%, 41%)',

	// Yellow
	'hsl(44, 95%, 92%)',
	'hsl(45, 95%, 85%)',
	'hsl(44, 96%, 70%)',
	'hsl(44, 98%, 53%)',
	'hsl(40, 100%, 52%)',
	'hsl(34, 100%, 49%)',

	// Green
	'hsl(99, 59%, 90%)',
	'hsl(99, 60%, 81%)',
	'hsl(99, 61%, 63%)',
	'hsl(99, 85%, 42%)',
	'hsl(101, 87%, 33%)',
	'hsl(103, 91%, 26%)',

	// Blue
	'hsl(199, 100%, 92%)',
	'hsl(199, 100%, 84%)',
	'hsl(199, 100%, 68%)',
	'hsl(199, 100%, 50%)',
	'hsl(201, 100%, 40%)',
	'hsl(203, 100%, 32%)',

	// Purple
	'hsl(295, 39%, 89%)',
	'hsl(295, 40%, 78%)',
	'hsl(295, 40%, 57%)',
	'hsl(295, 79%, 34%)',
	'hsl(294, 82%, 26%)',
	'hsl(296, 100%, 19%)',

	// Pink
	'hsl(325, 46%, 89%)',
	'hsl(325, 48%, 78%)',
	'hsl(325, 48%, 57%)',
	'hsl(325, 98%, 33%)',
	'hsl(327, 99%, 26%)',
	'hsl(329, 100%, 21%)'
];

function debugEnabled(namespace: string): boolean {
	let debugExpression;
	try {
		if (window.localStorage) {
			debugExpression = window.localStorage.getItem('debug');
		}
	} catch (error) {
		if (
			error instanceof DOMException &&
			(error.name === 'DataCloneError' ||
				error.code === 25) /* DATA_CLONE_ERR */
		) {
			console.warn(
				"ts.io error while setting up debug logging. You should ignore this message or set 'allow-same-origin' while sandboxing your iframe.\n" +
					JSON.stringify(error, null, 2)
			);
		} else {
			console.warn(
				'ts.io error while setting up debug logging.\n' +
					JSON.stringify(error, null, 2)
			);
		}
	}
	// No expression, no logging.
	if (!debugExpression) {
		return false;
	}
	const debugExpressionLength = debugExpression.length;
	// If the namespace is shorter than the expression, it definitely won't match.
	if (namespace.length < debugExpressionLength) {
		return false;
	}
	// '*' => Log everything.
	if (debugExpression === '*') {
		return true;
	}
	let shouldEnable = false;
	for (let i = 0; i < debugExpressionLength; i++) {
		const debugExpressionChar = debugExpression[i];
		const matchNamespace = debugExpressionChar === namespace[i];
		const atLastChar = i === debugExpressionLength - 1;
		if (matchNamespace || (atLastChar && debugExpressionChar === '*')) {
			shouldEnable = true;
			continue;
		} else {
			shouldEnable = false;
			break;
		}
	}
	return shouldEnable;
}

/**
 * Console debug logger.
 */
class Log {
	private previousTime = 0;
	private readonly noColors: boolean;

	/**
	 * @constructor
	 * @param {string} namespace Namespace
	 * @param {string} color Color
	 */
	constructor(private namespace: string, private color: string) {
		this.noColors = console.log
			.toString()
			.toLowerCase()
			.includes('browserstack');
	}

	/**
	 * @param {string=} message Message
	 * @param {any[]} optionalParams Optional Params
	 */
	public log(message, ...optionalParams) {
			const now = window.performance.now();
			const deltaTime = now - (this.previousTime || now);
			this.previousTime = now;
			if (this.noColors) {
				console.log(
					`${this.namespace} - ${message} - ${parseFloat(deltaTime.toString()).toFixed(
						2
					)}ms`,
					...optionalParams
				);
			} else {
				console.log(
					`%c${this.namespace}%c - ${message} - %c${parseFloat(
						deltaTime.toString()
					).toFixed(2)}ms`,
					`color: ${this.color};`,
					'font-weight: normal;',
					...optionalParams,
					`color: ${this.color};`
				);
			}
	};
}

/**
 * Generate a debug logger.
 * @param {string} namespace Namespace
 * @return {Function}
 */
export function log(namespace: string) {
	if (!debugEnabled(namespace)) {
		return function() {};
	}

	let hash = 0;
	const namespaceLength = namespace.length;
	for (let i = 0; i < namespaceLength; i++) {
		hash = (hash << 5) - hash + namespace.charCodeAt(i);
		hash |= 0; // Convert to 32bit integer
	}

	const color = colors[Math.abs(hash) % colors.length];
	const debug = new Log(namespace, color);
	return debug.log;
}
