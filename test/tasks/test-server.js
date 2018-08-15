const httpServer = require('http-server');
const ports = require('../config.json');

module.exports = cb => {
	const baseServer = httpServer.createServer({
		cache: -1
	});
	const crossdomainServer = httpServer.createServer({
		cache: -1
	});
	baseServer.listen(ports.base, '0.0.0.0', () => {
		console.log('Started HTTP Server 1/2 on port ' + ports.base);
		crossdomainServer.listen(ports.crossdomain, '0.0.0.0', () => {
			console.log('Started HTTP Server 2/2 on port ' + ports.crossdomain);
			cb(baseServer, crossdomainServer);
		});
	});
};
