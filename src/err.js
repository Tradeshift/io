export class SpawnError extends Error {
	constructor(message) {
		super(message);
		this.name = 'ts:io:SpawnError';
	}
	toJSON() {
		return {
			name: this.name,
			message: this.message
		};
	}
}
