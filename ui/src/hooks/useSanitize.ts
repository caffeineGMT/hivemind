import { useMemo } from 'react';
import DOMPurify from 'dompurify';

/**
 * Hook to sanitize HTML content before rendering
 * Prevents XSS attacks by removing dangerous HTML/JavaScript
 */
export function useSanitize(dirty: string | null | undefined): string {
  return useMemo(() => {
    if (!dirty) return '';

    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'br', 'p', 'span', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'title', 'class'],
      ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
    });
  }, [dirty]);
}

/**
 * Hook for strict sanitization (removes all HTML tags)
 * Use for fields that should never contain HTML
 */
export function useSanitizeStrict(dirty: string | null | undefined): string {
  return useMemo(() => {
    if (!dirty) return '';

    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }, [dirty]);
}

/**
 * Utility function for one-off sanitization (non-hook)
 */
export function sanitize(dirty: string | null | undefined): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'br', 'p', 'span', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}

/**
 * Strict utility function (removes all HTML)
 */
export function sanitizeStrict(dirty: string | null | undefined): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}
