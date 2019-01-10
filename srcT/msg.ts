/**
 * The Message.
 * @typedef {object} Message
 * @property {string} type The type of the message. (one of ['CONNECT', 'CONNACK', 'EVENT', 'PINGREQ', 'PINGRES'])
 * @property {string=} topic The topic of the message. (required for 'EVENT' type)
 * @property {string=} target Target appId. (required for ['EVENT', 'CONNACK', 'PINGREQ'] types)
 * @property {boolean} viaHub The message was brokered by the Hub.
 * @property {string=} token Hack-proof session token. (required for all types except 'CONNECT')
 * @property {*=} data Data to be passed with the message. Can be any type that is compatible with the structured clone algorithm,
 */

const targetOrigin = '*';

function isWindow(win: Window): boolean {
	try {
		return !!(win && win.postMessage);
	} catch (error) {
		return false;
	}
}

/**
 * Send message to target window.
 * @param {Message} message
 * @param {Window=} targetWindow
 */
export function postMessage(message: IoMessage, targetWindow: Window = window.top): void {
	if (!isWindow(targetWindow)) {
		throw new Error('postMessage called on a non Window object.');
	}

	try {
		targetWindow.postMessage(message, targetOrigin);
	} catch (error) {
		if (
			error instanceof DOMException &&
			(error.name === 'DataCloneError' ||
				error.code === 25) /* DATA_CLONE_ERR */
		) {
			throw new Error(
				"ts.io method called with { data } argument that can't be cloned using the structural clone algorithm."
			);
		} else {
			console.warn(
				'Something went wrong while sending postMessage.\n' +
					JSON.stringify(error, null, 2)
			);
		}
	}
}

const messageQueue: MessageQueue[] = [];

export function queueMessage(message: IoMessage, targetWindow: Window = window.top): void {
	messageQueue.push(new MessageQueue(targetWindow, message));
}

export function flushQueue(token): number {
	if (messageQueue.length) {
		messageQueue
			.reverse()
			.forEach(queuedMessage =>
				queuedMessage.targetWindow.postMessage(
					{ ...queuedMessage.message, token },
					targetOrigin
				)
			);
		return messageQueue.length;
	}

	return 0;
}

/**
 * Validate message.
 * @param {Message} message
 */
export function messageValid(message: IoMessage): boolean {
	return !!(message && message.type);
}

/**
 * Validate message for 'SPAWN', 'SPAWNED', 'EVENT', etc. complex types.
 * @param {Message} message
 */
export function complexMessageValid(message: IoMessage): boolean {
	return !!(messageValid(message) && message.target);
}

/**
 * Message is sent to an App.
 * @param {Message} message
 */
export function appMessageValid(message: IoMessage): boolean {
	return (
		messageValid(message) &&
		message.viaHub &&
		[
			IoMessageType.CONNACK,
			IoMessageType.EVENT,
			IoMessageType.PING,
			IoMessageType.SPAWN_SUCCESS,
			IoMessageType.SPAWN_FAIL
		].includes(message.type)
	);
}

/**
 * Message sent to the Hub.
 * @param {Message} message
 */
export function hubMessageValid(message: IoMessage): boolean {
	return (
		messageValid(message) &&
		!message.viaHub &&
		[
			IoMessageType.CONNECT,
			IoMessageType.EVENT,
			IoMessageType.PONG,
			IoMessageType.SPAWN,
			IoMessageType.SPAWN_SUCCESS,
			IoMessageType.SPAWN_FAIL
		].includes(message.type)
	);
}

/**
 * Does the topic match the expression?
 *
 * @todo Support more than '*' or exact match.
 *
 * @param {string} topicExpression Topic expression to match.
 * @param {string} topic Topic to match.
 */
export function matchTopic(topicExpression: string, topic: string): boolean {
	if (topicExpression === '*') {
		return true;
	}
	return topicExpression === topic;
}

class MessageQueue {
	constructor(public readonly targetWindow: Window, public readonly message: any) {}
}

export class IoMessage {
	public message: string;
	public viaHub: boolean;
	public data: any;
	public topic: string;
	public token: string;
	public target: string | Window;
	public source: Window;

	constructor(public type: IoMessageType) {}
}

export enum IoMessageType {
	CONNACK = 'CONNACK',
	PING = 'PING',
	CONNECT = 'CONNECT',
	EVENT = 'EVENT',
	PONG = 'PONG',
	SPAWN = 'SPAWN',
	SPAWN_SUCCESS = 'SPAWN-SUCCESS',
	SPAWN_FAIL = 'SPAWN-FAIL'
}

