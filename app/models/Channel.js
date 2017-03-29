'use strict';
/**
 * A channel is 'group' containing users about Topics
 */
const User = require('./User');
const Topic = require('./Topic');

class Channel {
	constructor( id, name, users, topics ) {
		this.id = id;
		this.name = name;
		this.users = users ? users : [];
		this.topics = topics ? topics : [];
	}
};

module.exports = Channel;
