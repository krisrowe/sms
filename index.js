const { GoogleAuth } = require('google-auth-library');
const {PubSub} = require('@google-cloud/pubsub');
const logger = require('./logger');
const pubSubClient = new PubSub();
const messenger = require('./messenger'); // Adjust this path to where your messenger module is located

// Helper function to process messages
async function processMessage(message) {
    if (!message || typeof message !== 'object') {
        throw new Error("No message received or message format is invalid.");
    }
    
    let messageId;
    let messageData;

    if (message.data) {
        // Handling Pub/Sub message
        messageId = message.messageId || message.id;
        logger.info('Processing an SMS message as Pub/Sub message id ' + messageId);
        const data = Buffer.from(message.data, 'base64').toString();
        messageData = JSON.parse(data);
    } else {
        // Assume message is a direct payload
        logger.info('Processing a direct payload.');
        messageId = 'DirectPayload-' + Date.now(); // Assign a unique ID for logging
        messageData = message;
    }

    try {
        logger.debug("Processing message id " + messageId);
        let smsResult = await messenger.sendSms(messageData);
        logger.debug("Result of sending SMS message id " + messageId + ": " + JSON.stringify(smsResult));
    } catch (error) {
        logger.error(`Error sending SMS for message id ${messageId}: ${error}`);
        if (process.env.LOG_MSG_ON_ERR) {
            logger.error(`Message data: ${JSON.stringify(messageData)}`);
        }
        throw error;
    }

    return true;
}

// Function to handle messages from Pub/Sub push subscription
exports.send = async (message, context) => {
    await processMessage(message);
};

async function getProjectId() {
    const auth = new GoogleAuth();
    const projectId = await auth.getProjectId();
    return projectId;
}

exports.pull = async (req, res) => {
    const SUBSCRIPTION_NAME = process.env.PULL_SUBSCRIPTION_NAME;
    if (!SUBSCRIPTION_NAME) {
      logger.error('Pull subscription name (PULL_SUBSCRIPTION_NAME) is not defined in the environment variables.');
      res.status(500).send('The server is misconfigured. Please try again later.');
      return;
    }

    const projectId = await getProjectId();
    console.log("Project ID: " + projectId);

    const LISTEN_SECONDS = parseInt(process.env.LISTEN_SECONDS + "", 10) || 5;
    const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES + "", 10) || 10;
    const ALWAYS_ACK = process.env.ALWAYS_ACK !== 'false';
    logger.debug(`Reading subscription named ${SUBSCRIPTION_NAME} to a maximum of ${MAX_MESSAGES} messages...`);  
    const subscription = pubSubClient.subscription(SUBSCRIPTION_NAME);
    
    let messagesPulled = 0;
    let messagesProcessed = 0;
    let messagesAcknowledged = 0;
    let messagesSuccessfullyProcessed = 0;
    let timeoutId; // Timeout ID for response handling
    let stillListening = true;
    let responseSent = false;
    let messagePromises = [];
  
    // Listen for new messages
    const messageHandler = async message => {
        // As quickly as possible, shut down the listening if we
        // have reached the quota. 
        const sequence = ++messagesPulled; // save the sequence separately as messagesPulled may get changed concurrently
        if (sequence >= MAX_MESSAGES) {
            // Determine if the subscription is still listening for messages.
            if (stillListening) {
                // Stop listening for further messages to prevent this function
                // from being called again.
                subscription.removeListener('message', messageHandler);
                stillListening = false;
                logger.debug(`Stopped listening for further messages in subscription named ${SUBSCRIPTION_NAME} after reaching the configured maximum of ${MAX_MESSAGES} messages.`);
            } else {
                logger.debug(`No longer listening for messages in subscription named ${SUBSCRIPTION_NAME}.`);
            }
            if (sequence > MAX_MESSAGES) {
                logger.debug(`Declining to process or acknowledge message id ${message.id} as message number ${sequence} because we have exceeded the configured maximum of ${MAX_MESSAGES} messages.`);
                return;
            }
        }
        
        logger.debug(`Pulled message id ${message.id}`);

        if (sequence <= MAX_MESSAGES) {
            logger.debug(`Processing message id ${message.id}...`);
            messagesProcessed++;

            messagePromises.push(new Promise(async (resolve, reject) => {
                try {
                    // Process the message
                    var processMessageSuccess;
                    try {
                        await processMessage(message);
                        processMessageSuccess = true;
                        messagesSuccessfullyProcessed++;
                    } catch (error) {
                        processMessageSuccess = false;
                        logger.error(`Error processing pulled message ${message.id}: ${error}`);
                    }

                    if (processMessageSuccess || ALWAYS_ACK) {
                        // Acknowledge the message if ALWAYS_ACK is true or processing succeeded
                        await message.ack();
                        messagesAcknowledged++;
                        logger.debug(`Acknowledged message ${message.id} in subscription named ${SUBSCRIPTION_NAME}.`);  
                    } else {
                        logger.debug(`Skipping acknowledgment of message ${message.id} in subscription named ${SUBSCRIPTION_NAME} due to error.`);  
                    }
                    resolve(message);
                } catch (error) {
                    reject(error);
                }
            }));
        }

        // Check if the maximum number of messages processed
        if (sequence >= MAX_MESSAGES) {
            sendResponse(); // has logic to only send once
        }
    };

    subscription.on('message', messageHandler);
  
    // Handle error
    subscription.on('error', error => {
      console.error('Error pulling messages:', error);
      res.status(500).send('Error pulling messages');
    });
  
    // Set a timeout to send response if not all messages are received within 30 seconds
    timeoutId = setTimeout(() => {
        // Set the next next flags as soon as possible for concurrency.
        if (stillListening) {
            stillListening = false;
            // Unsubscribe from further messages
            subscription.removeListener('message', messageHandler);
            logger.debug(`Stopped listening for messages after ${LISTEN_SECONDS} seconds.`);
        } else {
            // This scenario should theoretically happen rarely, if at all.
            logger.debug(`Timer elapsed for listening after ${LISTEN_SECONDS} seconds, but listening was already stopped.`);
        }
        sendResponse();
    }, LISTEN_SECONDS * 1000);
  
    // Function to send HTTP response when all messages have been processed or timeout occurs
    function sendResponse() {
        if (!responseSent) {
            responseSent = true; // set this as quicly as possible for concurrency
            clearTimeout(timeoutId); // clear timeout as soon as possible for concurrency
            // wait for completion of processing of messages
            Promise.all(messagePromises).then(() => {
                const summary = JSON.stringify({
                    pulled: messagesPulled,
                    processed: messagesProcessed,
                    successful: messagesSuccessfullyProcessed,
                    acknowledged: messagesAcknowledged
                }, null, 2);
                logger.debug(summary);
                // Send response
                res.setHeader('Content-Type', 'application/json');
                res.status(200).send(summary);
            }).catch((error) => {
                logger.error(`Failure while attempting to finish processing of ${messagesProcessed} messages: ${error}`);
            });
        }
    }
  };
  

