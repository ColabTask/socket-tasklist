'use strict';
/**
 * Handle the user connection and subscriptions
 */
const ManagerException = require('./ManagerException');
const ManagerExceptionType = require('./ManagerException');
const User = require('./models/User');
const Channel = require('./models/Channel');
const Topic = require('./models/Topic');

class Manager {
	static fromConfiguration(configuration) {	
		const channels = configuration['channels'].map((c, idChannel) => {
			const channel = new Channel(idChannel+1, c['name']);
			channel.topics = c['topics'].map((t, idTopic) => new Topic(idTopic+1, t['name']) );
			return channel;
		});
		const manager = new Manager(configuration['application']['maxSimultaneousConn']);
		manager.setChannels(channels);
		return manager;
	}

	constructor(maxSimultaneousConn) {
		this.maxConn = maxSimultaneousConn;
		this.channels = [];
		this.users = {};
		this.usersToChannels = {};
	}

	/**
	 * Set a list of channels and their topics
	 * @param {Array<Channel>} channels
	 */
	setChannels(channels) {
		this.channels = channels;
	}

	/**
	 * Check if a user is connected
	 * @param {number} id
	 * @return boolean
	 */
	isConnected(id) {
		return this.users[id] != undefined;
	}

	/**
	 * Add a new connected user
	 * @param {number} id If of the user
	 * @param {string} username 
	 * @param {string} token Session token
	 * @param {string} connection Connection identifier
	 */
	connect(id, username, token, connection) {
		if( this.isConnected(id) ) {
			if( this.users[id].connections.length > this.maxConn ) {
				throw new ManagerException(ManagerExceptionType.USER_MAX_CONNECTION);
			}
			this.users[id].connections.push(connection);
		} else {
			const user = new User(id, username, token, [connection]);
			this.users[id] = user;
		}
	}

	/**
	 * Remove a connected user
	 * @param {id} id The id of the user to remove
	 */
	disconnect(id) {
		if( !this.isConnected(id) ) {
			throw new ManagerException(ManagerExceptionType.USER_NOT_CONNECTED);
		}
		if( this.usersToChannels[id] != undefined ) {
			delete this.usersToChannels[id];
		}
		delete this.users[id];
	}

	/**
	 * Check if a user has subscribed to a channel
	 * @param {number} userid
	 * @param {string} name Name of the channel
	 * @return boolean
	 */
	isSubscribed(userid, name) {
		if( this.usersToChannels[userid] == undefined ) {
			return false;
		}
		return this.usersToChannels[userid].indexOf(name) !== -1;
	}

	/**
	 * Return an array of connected channel id
	 * @param {number} id The user id
	 */
	getSubscribedChannel(id) {
		if( this.isConnected(id) && this.usersToChannel[id] != undefined ) {
			return this.usersToChannel[id];
		}
		return [];
	}

	/**
	 * Subscribe to a channel
	 * @param {number} userid
	 * @param {string} name Name of the channel to subscribe to
	 */
	subscribe(userid, name) {
		if( !this.isConnected(userid) ) {
			throw new ManagerException(ManagerExceptionType.USER_NOT_CONNECTED);
		}
		if( this.isSubscribed(userid, name) ) {
			throw new ManagerException(ManagerExceptionType.USER_ALREADY_SUBSCRIBED);
		}
		if( this.usersToChannel[userid] == undefined ) {
			this.usersToChannels[userid] = [];
		}
		this.usersToChannels[userid].push(name);
	}

	/**
	 * Unsubscribe from a channel
	 * @param {number} userid
	 * @param {string} name Name of the channel to unsubscribe
	 */
	unsubscribe(userid, name) {
		if( !this.isSubscribed(userid, name) ) {
			throw new ManagerException(ManagerExceptionType.USER_ALREADY_SUBSCRIBED);
		}
		this.usersToChannels[userid].splice( this.usersToChannels[userid].indexOf(name), 1 );
	}

}

module.exports = Manager;
