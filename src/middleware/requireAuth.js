import { extractToken, verifySessionToken } from "../auth.js";

/**
 * Middleware to require authentication for protected routes
 * Extracts and verifies JWT token, attaches user to request
 */
export function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const payload = verifySessionToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // Attach user info to request
  req.user = {
    id: payload.userId,
    email: payload.email,
    tier: payload.tier,
  };

  next();
}

/**
 * Optional auth middleware - doesn't block, just attaches user if authenticated
 */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      req.user = {
        id: payload.userId,
        email: payload.email,
        tier: payload.tier,
      };
    }
  }

  next();
}
