export class LifecycleHandler {
	onconstruct(target, parent) {
		return target; // In case there are redirects, the Chrome can supply a different appId
	}
	onconnect(target, win) {}
	onresolve(target, parent, topic, data) {}
}
