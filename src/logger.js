import winston from 'winston';
import { Writable } from 'node:stream';
import * as db from './db.js';

const dbStream = new Writable({
  write(chunk, encoding, callback) {
    try {
      const parsed = JSON.parse(chunk.toString());
      db.logStructured(parsed);
    } catch (err) {
      // Silently ignore parse errors
    }
    callback();
  }
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.Stream({ stream: dbStream })
  ]
});

export function log({level, source, companyId, agentId, taskId, action, metadata}) {
  logger.log(level || 'info', action, {
    source,
    company_id: companyId,
    agent_id: agentId,
    task_id: taskId,
    metadata
  });
}
