import winston from 'winston';
import * as db from './db.js';

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
    new winston.transports.Stream({
      stream: {
        write: (message) => {
          try {
            const parsed = JSON.parse(message);
            db.logStructured(parsed);
          } catch (err) {
            // Silently ignore parse errors for console output
          }
        }
      }
    })
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
