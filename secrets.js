const { google } = require('googleapis');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const secretManagerClient = new SecretManagerServiceClient();
const logger = require('./logger');

const _secrets = {};

async function getSecret(secretName) {
    const currentTime = Date.now(); // Get current time in milliseconds
    const cacheExpiration = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Check if the secret is cached and not expired
    if (_secrets[secretName] && (currentTime - _secrets[secretName].timestamp) < cacheExpiration) {
        return _secrets[secretName].value;
    }

    logger.info(`Getting secret ${secretName}`);
    const auth = new google.auth.GoogleAuth();
    const projectId = await auth.getProjectId();
    const secretVersionName = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await secretManagerClient.accessSecretVersion({ name: secretVersionName });

    if (!version || !version.payload || !version.payload.data) {
      throw new Error(`Failed to access secret version for ${secretName}`);
    }

    // Parse the secret data
    const secretData = version.payload.data.toString();

    // Cache the secret with the current timestamp
    _secrets[secretName] = {
        value: secretData,
        timestamp: currentTime // Store the time when the secret is cached
    };

    return secretData;
}

module.exports = { getSecret };