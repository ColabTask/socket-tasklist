'use strict';
/**
 * No business logic on this server: only re-route request to their recipients with some basic validation
 */

const express = require('express');
const http = require('http');
const fs = require('fs');
const Manager = require('./app/Manager');
const Emitter = require('./app/Emitter');
const Message = require('./app/models/Message');
const bodyParser = require('body-parser');

// Only connection from socket.io are supported
//const app = http.createServer((req, res) => {
//	res.writeHead(200, {'Content-Type': 'text/json'});
//	res.end({
//		'status': 'err',
//		'msg': 'Unsuported connection'
//	});
//});

const app = express();
const master = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

// Configure the server
const configuration = JSON.parse(fs.readFileSync(__dirname + '/configuration.json'));
const manager = Manager.fromConfiguration(configuration);
const emitter = new Emitter(manager);

// Make a request to the server with the token to retrieve the user info
const validateUser = (token, id, cb) => {
	const authentication = configuration.application.authentication;
	let body = '';
	const req = http.request({
		host: authentication.hostname,
		port: authentication.port,
		path: authentication.path + "/" + id,
		method: authentication.method,
		headers: {
			'Authorization': 'Token ' + token
		}
	}, (res) => {
		res.on('data', (chunk) => { body += chunk; });
		res.on('end', () => { cb(false, JSON.parse(body)); });
	});
	req.on('error', (e) => { cb(true, {msg: e.message}); });
	req.end();
};

server.listen(configuration.application.server.port, () => {
	console.log('Server listening at port: ' + configuration.application.server.port);
});

// Master connection: the socket server receive a message and distributes it
master.use(bodyParser.json());
master.use(bodyParser.urlencoded({ extended: true }));
master.post(configuration.application.master.path, (req, res) => {
	console.log(req.hostname);
	if( req.hostname != configuration.application.master.hostname ) {
		res.status(403).end();
		//return;
	}
	const secret = req.get('X-Authorization-Token');
	if( secret == undefined || secret != configuration.application.master.secret ) {
		res.status(403).end();
		//return;
	}
	const data = req.body;
	if(data == "") {
		res.status(403).end();
		return;
	}
	console.log("Received from master:", data);
	//const parsed = JSON.parse(data);
	// Distribute the message
	// Only 1-1 for now
	const message = Message.fromNotification(data);
	emitter.emit(message);
});
master.listen(configuration.application.master.port, () => {
	console.log('Listening for master event at port: ' + configuration.application.master.port);
});


io.on('connection', (socket) => {
	socket.emit('connect');
	// When a user is connected, make sure to validate the token with the main authentication server
	// Is the user already connected?
	socket.auth = false;
	socket.userid = null;
	socket.on('authenticate', (data, cb) => {
		if( data.token == undefined || data.id == undefined || data.token == '' || data.id == '' ) {
			socket.disconnect('unauthorized');
		}
		// Event is the user is already connected, validate the token once again
		validateUser(data.token, data.id, (err, msg) => {
			if( !err && msg.id != undefined && msg.id == data.id ) {
				socket.auth = true;
				socket.userid = data.id;
				try {
					manager.connect(msg.id, msg.username, data.token, socket);
					cb({status: true});
					//console.log(data);
					console.log('User id:' + data.id + ', username:' + data.username + ' is connected');
				} catch(e) {
					socket.disconnect('Maximum connection count reached');
					console.log(e);
				}
			}
		});
	});

	// One must be authenticated to access other endpoint
	socket.on('subscribe', (data, cb) => {
		if( !socket.auth ) {
			socket.disconnect('unauthorized');
			return;
		}

		if( data.channel == undefined || data.channel == '' ) {
			socket.disconnect('No channel provided');
		}

		try {
			manager.subscribe(socket.userid, data.channel);
			console.log('User id:' + socket.userid + ' is connected to: ' + data.channel);
		} catch(e) {
			console.log('User id:' + socket.userid + ' is already connected to ' + data.channel);
		}
		cb({status: true});
	});

	socket.on('unsubscribe', (data, cb) => {
		if( !socket.auth ) {
			socket.disconnect('unauthorized');
			return;
		}

		if( data.channel == undefined || data.channel == '' ) {
			socket.disconnect('No channel provided');
		}

		try {
			manager.unsubscribe(socket.userid, data.channel);
		} catch(e) {
			console.log('User id:' + socket.userid + ' tried to disconnect from unsubscribed channel ' + data.channel);
		}
		cb({status: true});
	});

	socket.on('disconnect', () => {
		try {
			manager.disconnect(socket.userid);
			console.log('User id:' + socket.userid + ' has left the server');
		} catch(e) {
			console.log('Tried to disconnect non connected user: ' + socket.userid);
		}
	});
});
