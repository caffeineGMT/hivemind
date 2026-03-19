import { z } from 'zod';

// Schema definitions for request validation
export const schemas = {
  createCompany: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    model: z.string().max(100).optional(),
    maxAgents: z.number().int().min(1).max(50).optional(),
    maxBudget: z.number().min(0).max(100000).optional(),
  }),

  createTask: z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignee: z.string().max(200).optional(),
    companyId: z.string().uuid().optional(),
  }),

  nudge: z.object({
    companyId: z.string().min(1),
    message: z.string().min(1).max(2000),
  }),

  updateConfig: z.object({
    maxAgents: z.number().int().min(1).max(50).optional(),
    maxBudget: z.number().min(0).max(100000).optional(),
    model: z.string().max(100).optional(),
    autoResume: z.boolean().optional(),
    webhookUrl: z.string().url().max(500).optional().nullable(),
  }),

  updateTask: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    result: z.string().max(50000).optional(),
  }),
};

// Validation middleware factory
export function validate(schemaName) {
  const schema = schemas[schemaName];
  if (!schema) {
    throw new Error(`Unknown validation schema: ${schemaName}`);
  }

  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}
