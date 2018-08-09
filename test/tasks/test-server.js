const httpServer = require('http-server');

module.exports = cb => {
	httpServer
		.createServer({
			cache: -1
		})
		.listen(8080, '0.0.0.0', () => {
			console.log('Started HTTP Server 1/2 on port 8080');
			httpServer
				.createServer({
					cache: -1
				})
				.listen(8081, '0.0.0.0', () => {
					console.log('Started HTTP Server 2/2 on port 8081');
					cb();
				});
		});
};
