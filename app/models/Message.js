'use strict';
/**
 * The message model contain the data to distribut accross the users
 */

class Message {
	static fromNotification(notification) {
		return new Message(
			notification.id,
			notification.receiver_id,
			notification.sender_id,
			notification.title,
			notification.text,
			new Date(notification.published_date),
			notification.status,
			notification.target_type,
			notification.target_id,
			notification.target_intention
		);
	}
	constructor(id, receiver_id, sender_id, title, text, published_date, status, target_type, target_id, target_intention) {
		this.id = id;
		this.receiver_id = receiver_id;
		this.sender_id = sender_id;
		this.title = title;
		this.text = text;
		this.published_date = published_date;
		this.status = status||1;
		this.target_type = target_type||'';
		this.target_id = target_id||0;
		this.target_intention = target_intention||'';
	}
}

module.exports = Message;
