const {PubSub} = require('@google-cloud/pubsub');
const pubSubClient = new PubSub();
const log = require('./logger'); // Make sure this path is correct for your logger module
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
        log.info('Processing an SMS message as Pub/Sub message id ' + messageId);
        const data = Buffer.from(message.data, 'base64').toString();
        messageData = JSON.parse(data);
    } else {
        // Assume message is a direct payload
        log.info('Processing a direct payload.');
        messageId = 'DirectPayload-' + Date.now(); // Assign a unique ID for logging
        messageData = message;
    }

    try {
        log.debug("Processing message id " + messageId);
        let smsResult = await messenger.sendSms(messageData);
        log.debug("Result of sending SMS message id " + messageId + ": " + JSON.stringify(smsResult));
    } catch (error) {
        log.error(`Error sending SMS for message id ${messageId}:`, error);
        throw error;
    }

    return true;
}

// Function to handle messages from Pub/Sub push subscription
exports.send = async (message, context) => {
    await processMessage(message);
};

exports.pull = async (req, res) => {
    const SUBSCRIPTION_NAME = process.env.PULL_SUBSCRIPTION_NAME;
    if (!SUBSCRIPTION_NAME) {
      log.error('Pull subscription name (PULL_SUBSCRIPTION_NAME) is not defined in the environment variables.');
      res.status(500).send('The server is misconfigured. Please try again later.');
      return;
    }

    console.log("Project ID:" + process.env.GOOGLE_CLOUD_PROJECT);
    console.log("Subscription Name:" + SUBSCRIPTION_NAME);
  
    const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES + "", 10) || 10;
    const ALWAYS_ACK = process.env.ALWAYS_ACK !== 'false';
    const subscription = pubSubClient.subscription(SUBSCRIPTION_NAME);
    
    let messagesProcessed = 0;
    let allMessagesProcessed = false; // Flag to track if all messages have been processed
    let timeoutId; // Timeout ID for response handling
  
    // Listen for new messages
    subscription.on('message', async message => {
      console.log(`Received message: ${message.id}`);
      
      try {
        await processMessage(message);
      } catch (error) {
        log.error(`Error processing message ${message.id}:`, error);
        if (!ALWAYS_ACK) {
          return; // Skip acknowledgment if ALWAYS_ACK is not true and an error occurred
        }
      }
      
      // Acknowledge the message if ALWAYS_ACK is true or processing succeeded
      await message.ack();
      
      // Increment the counter
      messagesProcessed++;
      
      // Check if the maximum number of messages processed
      if (messagesProcessed >= MAX_MESSAGES) {
        allMessagesProcessed = true;
        clearTimeout(timeoutId); // Clear the timeout as we've received enough messages
        sendResponse();
      }
    });
  
    // Handle error
    subscription.on('error', error => {
      console.error('Error pulling messages:', error);
      res.status(500).send('Error pulling messages');
    });
  
    // Set a timeout to send response if not all messages are received within 30 seconds
    timeoutId = setTimeout(() => {
      sendResponse();
    }, 30000); // Adjust as needed
  
    // Function to send HTTP response when all messages have been processed or timeout occurs
    function sendResponse() {
      if (allMessagesProcessed || messagesProcessed > 0) {
        // Unsubscribe from further messages
        subscription.removeListener('message', handleMessage);
  
        // Send response
        res.status(200).send(`Attempted to process ${messagesProcessed} messages.`);
      }
    }
  };
  
