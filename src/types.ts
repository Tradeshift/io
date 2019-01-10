import { AppInstance } from './app';

export interface AppDefinition {
	spawn?: () => void;
	connect?: () => void
}

export interface ConnackData {
	data: IoMessage;
	source: Window;
}

export interface AppPongs {
	timeoutIds: Set<number>,
	lastPong?: DOMHighResTimeStamp;
}

export interface AppSpawn {
	appId: string;
	message: ConnackData;
}

export interface AppPing {
	appId: string,
	token: string,
	targetWindow: Window
}

export interface HubInstance {
	HEARTBEAT: number;
	top?: () => AppInstance;
	forgetApp?: (targetWindow: Window) => void
}

export interface AppWindows {
	appId: string;
	token: string;
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
