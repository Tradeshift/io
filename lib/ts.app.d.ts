export as namespace ts;
export = app;

declare function app(): ts.app.Client;

declare namespace ts.app {
	declare interface Message {
		command: string;
		sourceAppId: string;
		destinationAppId: string;
		topic: string;
		data?: any;
	}
	declare interface Message {
		type: string;
		src: string;
		dst: string;
		tpc: string;
		dat?: any;
	}
	declare type MessageCallback = ((message: Message) => void);
	declare class Client {
		on(callback: MessageCallback): ts.app.Client;
		on(topic: string, callback: MessageCallback): ts.app.Client;

		publish(destinationAppId: string, topic: string, data?: any): ts.app.Client;
		publish(message: Message): ts.app.Client;

		request(
			destinationAppId: string,
			topic: string,
			data?: any
		): Promise<Object>;
		request(message: Message): Promise<Object>;

		spawn(destinationAppId: string, data?: any): Promise<Object>;
		spawn(message: Message): Promise<Object>;

		open(destinationAppId: string, data?: any): ts.app.Client;
		open(message: Message): ts.app.Client;

		pub(destinationAppId: string, topic: string, data?: any): ts.app.Client;
		pub(message: Message): ts.app.Client;

		req(destinationAppId: string, topic: string, data?: any): Promise<Object>;
		req(message: Message): Promise<Object>;

		spn(destinationAppId: string, data?: any): Promise<Object>;
		spn(message: Message): Promise<Object>;

		opn(destinationAppId: string, data?: any): ts.app.Client;
		opn(message: Message): ts.app.Client;
	}
}
