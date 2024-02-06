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

async function sendSms(body, to = null) {
    if (!body) {
        throw new Error('Missing required parameter: body');
    }
    if (to) {
        to = standardizePhoneNumber(to);
    }
    var twilio;
    try {
        twilio = await getTwilio();
    } catch (ex) {
        logger.error('Failed to initialize Twilio: ' + ex);
        throw ex;
    }
    to = to || twilio.secrets.defaultSendTo;
    try {
        return await twilio.client.messages.create({ 
            body: body,  
            messagingServiceSid: twilio.secrets.messagingServiceSid,      
            to: to
        }); 
    } catch (ex) {
        logger.log('error', 'Failed to send SMS: ' + ex);
        throw ex;  
    }   
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
