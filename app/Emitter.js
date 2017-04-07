'use strict'
/**
 * Emit a message to a single or multiple recipient
 */
const Manager = require('./Manager');
const Message = require('./models/Message');

class Emitter {
	constructor(manager) {
		this.manager = manager;
	}

	/**
	 * Emit a new message
	 * @param {Message} message
	 */
	emit(message) {
		const userid = message.receiver_id;
		if( !this.manager.isConnected(userid) ) {
			return;
		}
		if( !this.manager.isSubscribed(userid, message.target_type) ) {
			return;
		}
		const user = this.manager.getUser(userid);
		// Emit the message for each connection
		const channel = 'on' + message.target_type.charAt(0).toUpperCase() + message.target_type.slice(1);
		for( let i = 0; i < user.connections.length; i++ ) {
			user.connections[i].emit(channel, message);
		}
	}
}

module.exports = Emitter;
