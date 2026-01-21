import { inBrowserstack } from '../lib/helpers';
import { getHub, createApp, killAllApps } from '../lib/hub-mock';

import testAppEmit from './app.emit.spec';
import testAppOn from './app.on.spec';
import testAppSpawn from './app.spawn.spec';
import testHub from './hub.spec';

jasmine.getEnv().addReporter({
	specStarted(spec) {
		if (console && console.group && console.groupEnd && !inBrowserstack()) {
			console.group(spec.fullName);
		}
	},
	specDone(spec) {
		if (console && console.group && console.groupEnd && !inBrowserstack()) {
			console.groupEnd(spec.fullName);
		}
	}
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

const testGlobals = {
	apps: []
};
if (!inBrowserstack()) {
	console.log('------------  INIT BEG  ------------');
}

testGlobals.hub = getHub();
testGlobals.hub.HEARTBEAT = 1000;
testGlobals.topApp = testGlobals.hub.top();

describe('ts.io', () => {
	beforeEach(done => {
		if (!inBrowserstack()) {
			console.log('');
			console.log('------------  SETUP BEG  ------------');
		}
		testGlobals.apps.splice(
			0,
			testGlobals.apps.length,
			'Tradeshift.Unsecure',
			'Tradeshift.Sandbox',
			'Tradeshift.Crossdomain',
			'Tradeshift.SandboxCrossdomain'
		);
		createApp(testGlobals.apps[0]);
		createApp(testGlobals.apps[1], { sandbox: true });
		createApp(testGlobals.apps[2], { crossdomain: true });
		createApp(testGlobals.apps[3], {
			sandbox: true,
			crossdomain: true
		});
		setTimeout(() => {
			if (!inBrowserstack()) {
				console.log('------------  SETUP END  ------------');
				console.log('');
			}
			done();
		}, 0);
	});
	afterEach(done => {
		if (!inBrowserstack()) {
			console.log('');
			console.log('------------ CLEANUP BEG ------------');
		}
		killAllApps();
		function noFramesLeft() {
			if (window.document.getElementsByTagName('iframe').length) {
				setTimeout(noFramesLeft, 0);
			} else {
				if (!inBrowserstack()) {
					console.log('------------ CLEANUP END ------------');
					console.log('');
				}
				done();
			}
		}

		setTimeout(noFramesLeft, 0);
	});

	testAppEmit(testGlobals);
	testAppOn(testGlobals);
	testAppSpawn(testGlobals);
	testHub(testGlobals);
});
