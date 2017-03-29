'use strict';
/**
 * No business logic on this server: only re-route request to their recipients with some basic validation
 */

const express = require('express');
const http = require('http');
const fs = require('fs');
const Manager = require('./app/Manager');

// Only connection from socket.io are supported
//const app = http.createServer((req, res) => {
//	res.writeHead(200, {'Content-Type': 'text/json'});
//	res.end({
//		'status': 'err',
//		'msg': 'Unsuported connection'
//	});
//});

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

// Configure the server
const configuration = JSON.parse(fs.readFileSync(__dirname + '/configuration.json'));
const manager = Manager.fromConfiguration(configuration);

// Make a request to the server with the token to retrieve the user info
const validateUser = (token, id, cb) => {
	const authentication = configuration.application.authentication;
	let body = '';
	const req = http.request({
		hostname: authentication.hostname,
		port: authentication.port,
		path: authentication.path + "/" + id,
		method: authentication.method,
		headers: {
			'Authorization': 'Token ' + token
		}
	}, (res) => {
		res.on('data', (chunk) => { body += chunk; });
		res.on('end', () => { cb(true, JSON.parse(body)); });
	});
	req.on('error', (e) => { cb(false, {msg: e.message}); });
};

server.listen(configuration.application.server.port, () => {
	console.log('Server listening at port: ' + configuration.application.server.port);
});

io.on('connect', (socket) => {
	// When a user is connected, make sure to validate the token with the main authentication server
	// Is the user already connected?
	socket.auth = false;
	socket.userid = null;
	socket.on('authenticate', (data) => {
		if( data.token == undefined || data.id == undefined || data.token == '' || data.id == '' ) {
			socket.disconnect('unauthorized');
		}
		// Event is the user is already connected, validate the token once again
		validateUser(data.token, data.id, (err, msg) => {
			if( !err && msg.id != undefined && msg.id == data.id ) {
				socket.auth = true;
				socket.userid = data.id;
				try {
					manager.connect(msg.id, msg.username, token, socket);
					console.log('User id:' + data.id + ', username:' + data.username + ' is connected');
				} catch(e) {
					socket.disconnect('Maximum connection count reached');
				}
			}
		});
	});

	// One must be authenticated to access other endpoint
	socket.on('subscribe', (data) => {
		if( !socket.auth ) {
			socket.disconnect('unauthorized');
			return;
		}

		if( data.channel == undefined || data.channel == '' ) {
			socket.disconnect('No channel provided');
		}

		try {
			manager.subscribe(socket.userid, data.channel);
		} catch(e) {
			console.log('User id:' + socket.userid + ' is already connected to ' + data.channel);
		}
	});

	socket.on('unsubscribe', (data) => {
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
	});

	socket.on('disconnect', () => {
		try {
			manager.disconnect(socket.userid);
		} catch(e) {
			console.log('Tried to disconnect non connected user: ' + socket.userid);
		}
	});
});
