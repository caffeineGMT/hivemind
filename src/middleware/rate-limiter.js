import rateLimit from 'express-rate-limit';

// Global rate limiter: 100 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
    });
  },
});

// Strict limiter for expensive operations (task creation, company creation, etc.)
export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for this operation. Max 10 per minute.' },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded for this operation. Please wait before trying again.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
    });
  },
});

// Nudge limiter: 10 requests per minute
export const nudgeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Nudge rate limit exceeded. Max 10 per minute.' },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Nudge rate limit exceeded. Max 10 per minute.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
    });
  },
});

// Deploy limiter: 5 requests per hour
export const deployLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Deploy rate limit exceeded. Max 5 per hour.' },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Deploy rate limit exceeded. Max 5 per hour.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
    });
  },
});

// Agent operation limiter: 50 requests per hour
export const agentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Agent operation rate limit exceeded. Max 50 per hour.' },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Agent operation rate limit exceeded. Max 50 per hour.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
    });
  },
});

// API key-based limiter for future API access (higher limits for authenticated users)
export const apiKeyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: { error: 'API rate limit exceeded. Max 1000 per minute.' },
  handler: (req, res) => {
    res.status(429).json({
      error: 'API rate limit exceeded. Max 1000 per minute.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
    });
  },
});
