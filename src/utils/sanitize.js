import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize user input to prevent XSS attacks
 * Allows safe HTML tags like bold, italic, links, code
 * Strips dangerous tags like <script>, <iframe>, event handlers, etc.
 */
export function sanitizeInput(dirty) {
  if (!dirty) return dirty;
  if (typeof dirty !== 'string') return dirty;

  return sanitizeHtml(dirty, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'br', 'p', 'span', 'ul', 'ol', 'li'],
    allowedAttributes: {
      a: ['href', 'title'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    // Remove all event handlers
    transformTags: {
      a: (tagName, attribs) => {
        // Prevent javascript: URLs
        if (attribs.href && attribs.href.startsWith('javascript:')) {
          return { tagName: 'a', attribs: {} };
        }
        // Add rel="noopener noreferrer" for security
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            rel: 'noopener noreferrer',
          },
        };
      },
    },
  });
}

/**
 * Strict sanitization that removes ALL HTML tags
 * Use for fields that should never contain HTML (e.g., names, IDs)
 */
export function sanitizeStrict(dirty) {
  if (!dirty) return dirty;
  if (typeof dirty !== 'string') return dirty;

  return sanitizeHtml(dirty, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

/**
 * Sanitize an object's string properties
 * Recursively sanitizes all string values in an object
 */
export function sanitizeObject(obj, strict = false) {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitizer = strict ? sanitizeStrict : sanitizeInput;
  const result = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizer(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value, strict);
    } else {
      result[key] = value;
    }
  }

  return result;
}
