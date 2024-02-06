const path = require('path');
const process = require('process');
const logger = require('./logger');
const secretsManager = require('./secrets'); 

const SECRETS_PATH = process.env.TWILIO_CREDS_PATH || path.join(process.cwd(), 'secrets/twilio.json');

var _twilio;

async function getTwilio() {
    if (!_twilio) {
        var secrets;
        var twilioJSON;
        try {
            twilioJSON = await secretsManager.getSecret("twilio");
        } catch (err) {
            throw new Error(`Failed to read secrets for Twilio from secrets manager: ${err}`);
        }
        var secrets;
        try {
            secrets = JSON.parse(twilioJSON); 
        } catch (ex) {
            throw new Error(`Failed to parse secrets JSON for Twilio: ${ex}`);
        }
        var client;
        try {
            client = require('twilio')(secrets.accountSid, secrets.token); 
        } catch (ex) {
            throw new Error(`Failed to initialize client Twilio: ${ex}`);
        } 
        _twilio = { secrets: secrets, client: client };
    }
    return _twilio;
}

async function sendSms(message) {
    if (!message) {
        throw 'No message specified.';
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

    var to;
    if (process.env.OVERRIDE_TO) {
        to = process.env.OVERRIDE_TO;
        logger.info("The 'to' property of the message object has been overridden by the OVERRIDE_TO environment variable.");
    } else {
        to = message.to;
    }
    to = standardizePhoneNumber(to);
    const maskedTo = maskPhoneNumber(to);
    logger.info(`Sending SMS to ${maskedTo}: ${message.body}`);

    var twilio;
    try {
        twilio = await getTwilio();
    } catch (ex) {
        logger.error('Failed to initialize Twilio: ' + ex);
        throw ex;
    }
    to = to || twilio.secrets.defaultSendTo;
    var twilioResponse;
    try {
        twilioResponse = await twilio.client.messages.create({ 
            body: message.body,  
            messagingServiceSid: twilio.secrets.messagingServiceSid,      
            to: to
        }); 
    } catch (ex) {
        logger.error('Failed to send SMS: ' + ex);
        throw ex;  
    }   
    // return true if twilioResponse is an object
    return twilioResponse && typeof twilioResponse === 'object';
}

/**
 * Masks a phone number except for the first 4 digits.
 * 
 * @param {string} phoneNumber The phone number to mask.
 * @return {string} The masked phone number.
 */
function maskPhoneNumber(phoneNumber) {
    // Remove non-digit characters from the phone number
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Check if the phone number has enough digits to mask
    if (digitsOnly.length <= 4) {
      return digitsOnly; // Return as is if not enough digits to mask
    }
    
    // Keep the first 4 digits unmasked and mask the rest
    const visibleSection = digitsOnly.slice(0, 4);
    const maskedSection = digitsOnly.slice(4).replace(/\d/g, '*');
    
    return visibleSection + maskedSection;
  }
  

function standardizePhoneNumber(phoneNumber) {
    if (!phoneNumber) {
        return phoneNumber;
    }
    // remove any of the following 
    // - open parenthesis
    // - close parenthesis
    // - dash
    // - space
    var raw = phoneNumber.replace(/[\(\)\-\s]/g, '');
    if (/^\+?\d+$/.test(raw) == false) {
        throw new Error('Invalid phone number format.');
    }
    if (!raw.startsWith('+')) {
        raw = "+1" + raw;
    }
    return raw;
}

module.exports = { sendSms, standardizePhoneNumber };
