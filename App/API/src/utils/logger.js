const { createLogger, format, transports } = require('winston');
const { combine, timestamp, simple } = format;

// Create a logger instance with custom options
const logger = createLogger({
  level: 'info', // Default logging level
  format: combine(
    timestamp(), // Adds a timestamp to the log
    simple()     // Simple log format
  ),
  transports: [
    new transports.Console(), // Log to the console
    new transports.File({ filename: 'error.log', level: 'error' }), // Log only errors to a file
    new transports.File({ filename: 'combined.log' }) // Log all levels 'info' and above to another file
  ],
});


module.exports = logger;
