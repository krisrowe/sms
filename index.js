const log  = require('./logger');

async function send(message, context) {
    if (!message || typeof message !== 'object') {
        throw new Error("No message received or message format is invalid.");
    }
    
    let messageId;
    let messageData;

    // Determine if message is a Pub/Sub message or direct payload
    if (message.data) {
        // Handling Pub/Sub message
        messageId = message.messageId || message.id;
        log.info('Processing an SMS message as Pub/Sub message id ' + messageId);
        const data = Buffer.from(message.data, 'base64').toString();
        log.debug(`Message data length for pub sub message id ${messageId}: ${data.length}`);
        messageData = JSON.parse(data);
    } else if (message.type) {
        // Handling direct payload (e.g., from testing feature)
        log.info('Processing a direct payload without pub sub message envelope.');
        messageId = message.id || 'DirectPayload-' + Date.now(); // Assign a unique ID for logging
        messageData = message; // Directly use the message as booking data
    } else {
        throw new Error("Invalid message format. Message must have 'data' or 'type'.");
    }

    log.debug("JSON parsed successfully for data in message id " + messageId + ".");
    const messenger = require('./messenger');
    let smsResult = await messenger.sendSms(messageData);
    log.debug("Result of sending SMS message id " + messageId + ": " + JSON.stringify(smsResult));

    return true;
}


// Export the name assigned when deploying as a Cloud Function
// so that the corect entry point will be found and used.
exports.send = send;
