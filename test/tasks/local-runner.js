const testServer = require('./test-server');
const ports = require('../config.json');

testServer(() =>
	console.log(
		'Open http://localhost:' +
			ports.base +
			'/test/jasmine/index.html in a browser to test.'
	)
);
