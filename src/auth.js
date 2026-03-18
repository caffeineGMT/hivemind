import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const JWT_EXPIRES_IN = "7d";

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT session token
 * @param {object} payload - Token payload (userId, email, tier)
 * @returns {string} JWT token
 */
export function generateSessionToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload or null if invalid
 */
export function verifySessionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Extract token from Authorization header or cookie
 * @param {object} req - Express request object
 * @returns {string|null} Token or null
 */
export function extractToken(req) {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check httpOnly cookie
  if (req.cookies && req.cookies.session) {
    return req.cookies.session;
  }

  return null;
}

// Tier limits configuration
export const TIER_LIMITS = {
  free: {
    projects: 1,
    agents: 2,
    monthlyBudget: 10, // $10/month
  },
  pro: {
    projects: 5,
    agents: 10,
    monthlyBudget: 100, // $100/month
  },
  team: {
    projects: 20,
    agents: 50,
    monthlyBudget: 1000, // $1000/month
  },
};

/**
 * Get tier limits for a given tier
 * @param {string} tier - Tier name (free, pro, team)
 * @returns {object} Tier limits
 */
export function getTierLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password
 * @returns {object} { valid: boolean, message: string }
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain a lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain an uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain a number" };
  }
  return { valid: true, message: "" };
}
