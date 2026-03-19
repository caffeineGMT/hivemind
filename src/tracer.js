import crypto from "node:crypto";
import * as db from "./db.js";

// Generate unique IDs for traces and spans
function generateTraceId() {
  return crypto.randomUUID();
}

function generateSpanId() {
  return crypto.randomBytes(8).toString("hex");
}

// Active trace context (in-memory, per task)
const activeTraces = new Map();

/**
 * Start a new trace for a task
 * @param {string} taskId - The task ID
 * @param {string} operation - The operation name (e.g., "task_execution")
 * @param {object} metadata - Additional metadata
 * @returns {object} Trace context { traceId, spanId }
 */
export function startTrace(taskId, operation, metadata = {}) {
  const traceId = generateTraceId();
  const spanId = generateSpanId();

  const span = {
    traceId,
    spanId,
    parentSpanId: null,
    operation,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      task_id: taskId,
    }
  };

  // Store span in database
  db.saveSpan(span);

  // Track active trace
  activeTraces.set(taskId, { traceId, spanId });

  return { traceId, spanId };
}

/**
 * Create a child span within an existing trace
 * @param {string} taskId - The task ID
 * @param {string} operation - The operation name
 * @param {object} metadata - Additional metadata
 * @returns {object} Span context { traceId, spanId, parentSpanId }
 */
export function createSpan(taskId, operation, metadata = {}) {
  const traceContext = activeTraces.get(taskId);

  if (!traceContext) {
    // No active trace, start a new one
    return startTrace(taskId, operation, metadata);
  }

  const spanId = generateSpanId();
  const span = {
    traceId: traceContext.traceId,
    spanId,
    parentSpanId: traceContext.spanId,
    operation,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      task_id: taskId,
    }
  };

  // Store span in database
  db.saveSpan(span);

  // Update active span for this task
  activeTraces.set(taskId, { traceId: traceContext.traceId, spanId, parentSpanId: traceContext.spanId });

  return { traceId: span.traceId, spanId, parentSpanId: span.parentSpanId };
}

/**
 * End a span and optionally add completion metadata
 * @param {string} taskId - The task ID
 * @param {object} metadata - Completion metadata (e.g., status, result, error)
 */
export function endSpan(taskId, metadata = {}) {
  const traceContext = activeTraces.get(taskId);

  if (!traceContext) {
    return;
  }

  // Create completion event as a new span
  const spanId = generateSpanId();
  const span = {
    traceId: traceContext.traceId,
    spanId,
    parentSpanId: traceContext.spanId,
    operation: "span_end",
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      task_id: taskId,
      completed_span_id: traceContext.spanId,
    }
  };

  db.saveSpan(span);

  // Restore parent context if exists
  if (traceContext.parentSpanId) {
    activeTraces.set(taskId, {
      traceId: traceContext.traceId,
      spanId: traceContext.parentSpanId
    });
  }
}

/**
 * Log a trace event (convenience method for quick logging)
 * @param {string} taskId - The task ID
 * @param {string} operation - The operation name
 * @param {object} metadata - Event metadata
 */
export function logTrace(taskId, operation, metadata = {}) {
  createSpan(taskId, operation, metadata);
}

/**
 * End a trace completely (called when task is done)
 * @param {string} taskId - The task ID
 * @param {object} metadata - Final metadata
 */
export function endTrace(taskId, metadata = {}) {
  const traceContext = activeTraces.get(taskId);

  if (!traceContext) {
    return;
  }

  // Create final span
  const spanId = generateSpanId();
  const span = {
    traceId: traceContext.traceId,
    spanId,
    parentSpanId: traceContext.spanId,
    operation: "trace_end",
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      task_id: taskId,
    }
  };

  db.saveSpan(span);

  // Clean up active trace
  activeTraces.delete(taskId);
}

/**
 * Get current trace context for a task
 * @param {string} taskId - The task ID
 * @returns {object|null} Current trace context or null
 */
export function getTraceContext(taskId) {
  return activeTraces.get(taskId) || null;
}

/**
 * Wrap an async function with automatic span tracking
 * @param {string} taskId - The task ID
 * @param {string} operation - The operation name
 * @param {Function} fn - The async function to wrap
 * @param {object} metadata - Additional metadata
 * @returns {Promise} The result of the function
 */
export async function traced(taskId, operation, fn, metadata = {}) {
  const span = createSpan(taskId, operation, metadata);

  try {
    const result = await fn();
    endSpan(taskId, { status: "success", ...metadata });
    return result;
  } catch (error) {
    endSpan(taskId, {
      status: "error",
      error: error.message,
      stack: error.stack,
      ...metadata
    });
    throw error;
  }
}
