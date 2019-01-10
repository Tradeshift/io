import { AppInstance } from './app';
import { IoMessage } from './msg';

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
