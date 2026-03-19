import winston from 'winston';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, '..', 'logs');

const isProduction = process.env.NODE_ENV === 'production';

// Structured JSON format for production
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Readable format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, source, ...meta }) => {
    const src = source ? `[${source}]` : '';
    const extras = Object.keys(meta).length > 0
      ? ` ${JSON.stringify(meta)}`
      : '';
    return `${timestamp} ${level.toUpperCase().padEnd(5)} ${src} ${message}${extras}`;
  })
);

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: structuredFormat,
  defaultMeta: { service: 'hivemind' },
  transports: [
    new winston.transports.Console({
      format: isProduction ? structuredFormat : devFormat,
    }),
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// Create a child logger with preset context
export function createLogger(source, defaultMeta = {}) {
  return {
    info: (message, meta = {}) => logger.info(message, { source, ...defaultMeta, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { source, ...defaultMeta, ...meta }),
    error: (message, meta = {}) => logger.error(message, { source, ...defaultMeta, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { source, ...defaultMeta, ...meta }),
  };
}

// Legacy API compatibility
export function log({ level, source, companyId, agentId, taskId, action, metadata }) {
  logger.log(level || 'info', action, {
    source,
    company_id: companyId,
    agent_id: agentId,
    task_id: taskId,
    metadata,
  });
}

export default logger;
