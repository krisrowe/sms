const { Logging } = require('@google-cloud/logging');

const logging = new Logging();
const logName = process.env.FUNCTION_NAME || 'unknown-function';
const log = logging.log(logName);

const createLogEntry = async (message, severity) => {
  const metadata = {
    resource: { type: 'global' },
    severity: severity
  };
  const entry = log.entry(metadata, message);
  try {
    await log.write(entry);
  } catch (error) {
    console.error("Failed to log message '" + message + "' with error: " + error);
  }
};

module.exports = {
  debug: (message) => createLogEntry(message, 'DEBUG'),
  info: (message) => createLogEntry(message, 'INFO'),
  notice: (message) => createLogEntry(message, 'NOTICE'),
  warning: (message) => createLogEntry(message, 'WARNING'),
  error: (message) => createLogEntry(message, 'ERROR'),
  critical: (message) => createLogEntry(message, 'CRITICAL'),
  alert: (message) => createLogEntry(message, 'ALERT'),
  emergency: (message) => createLogEntry(message, 'EMERGENCY')
};
