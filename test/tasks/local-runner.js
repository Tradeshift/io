const testServer = require('./test-server');

testServer(() =>
	console.log(
		'Open http://localhost:8080/test/jasmine/index.html in a browser to test.'
	)
);
