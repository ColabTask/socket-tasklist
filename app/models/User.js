'use strict';
/**
 * User model use to describe a connected user
 */

class User {
	constructor(id, username, token, connections) {
		this.id = id;
		this.username = username;
		this.token = token;
		this.connections = connections ? connections : [];
	}
}

module.exports = User;
