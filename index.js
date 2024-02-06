const log  = require('./logger');

async function send(message, context) {
    if (!message || typeof message !== 'object') {
        throw new Error("No message received or message format is invalid.");
    }
    
    let messageId;
    let bookingData;

    // Determine if message is a Pub/Sub message or direct payload
    if (message.data) {
        // Handling Pub/Sub message
        messageId = message.messageId || message.id;
        log.info('Processing an SMS message as Pub/Sub message id ' + messageId);
        const data = Buffer.from(message.data, 'base64').toString();
        log.debug(`Message data length for pub sub message id ${messageId}: ${data.length}`);
        bookingData = JSON.parse(data);
    } else if (message.type) {
        // Handling direct payload (e.g., from testing feature)
        log.info('Processing a direct payload without pub sub message envelope.');
        messageId = message.id || 'DirectPayload-' + Date.now(); // Assign a unique ID for logging
        bookingData = message; // Directly use the message as booking data
    } else {
        throw new Error("Invalid message format. Message must have 'data' or 'type'.");
    }

    log.debug("JSON parsed successfully for message id " + messageId + ".");
    let processedData = await sendMessage(bookingData);

    return true;
}

async function sendMessage(message) {
    if (!message) {
        throw 'No message data received.';
    }
    // make sure message is an object
    if (typeof message !== 'object') {
        throw 'Message data is not an object.';
    }
    if (!message.to) {
        throw 'Specified message object must include a "to" property with a non-empty string value.';
    }
    if (!message.body) {
        throw 'Specified message object must include a "body" property with a non-empty string value.';
    }

    const to =  process.env.OVERRIDE_TO ? process.env.OVERRIDE_TO : message.to;
    const messenger = require('./messenger');
    console.log("Sending message: ", JSON.stringify(message));
    const result = await messenger.sendSms(message.body, to);
    return result;
}

// Export the name assigned when deploying as a Cloud Function
// so that the corect entry point will be found and used.
exports.send = send;
