const APIBuilder = require('@axway/api-builder-runtime');
const server = new APIBuilder();
const basicAuth = require("express-basic-auth");

// lifecycle examples
server.on('starting', function () {
	server.logger.debug('server is starting!');
	server.app.use(
		'/console',
		basicAuth({
    		challenge: true,
      		users: {
        		admin: server.config.apikey,
      		},
		})
  	);
});

server.on('started', function () {
	server.logger.debug('server started!');
});

// start the server
server.start();
