'use strict';
/**
 * Exceptions used from the Manager
 */

class ManagerException {
	constructor(exception, message) {
		this.name = exception;
		this.message = message ? message : '';
	}
}

const ManagerExceptionType = {
	USER_NOT_CONNECTED: 'USER_NOT_CONNECTED',
	USER_ALREADY_SUBSCRIBED: 'USER_ALREADY_SUBSCRIBED',
	USER_NOT_SUBSCRIBED: 'USED_NOT_SUBSCRIBED',
	USER_MAX_CONNECTION: 'USER_MAX_CONNECTION'
};

module.exports = {
	ManagerException,
	ManagerExceptionType
}
