// ============================================================
//  KIKI — Shared utilities for Netlify Functions
// ============================================================

/**
 * Build a standard JSON response
 */
function respond(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

/**
 * CORS headers for all functions
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}

/**
 * Standard CORS preflight response
 */
function handleOptions() {
  return { statusCode: 204, headers: corsHeaders(), body: '' };
}

/**
 * Basic email validation
 */
function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((str || '').trim());
}

/**
 * Strip HTML tags to prevent injection
 */
function sanitize(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/<[^>]*>/g, '').slice(0, maxLen);
}

/**
 * Parse JSON body safely
 */
function parseBody(event) {
  try {
    return { data: JSON.parse(event.body || '{}'), error: null };
  } catch {
    return { data: null, error: 'Invalid JSON body' };
  }
}

/**
 * Get client IP from Netlify event headers
 */
function getClientIP(event) {
  return (
    event.headers['x-forwarded-for']?.split(',')[0] ||
    event.headers['client-ip'] ||
    'unknown'
  );
}

/**
 * Simple async delay (for rate limiting / timing attack prevention)
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  respond,
  corsHeaders,
  handleOptions,
  isValidEmail,
  sanitize,
  parseBody,
  getClientIP,
  delay,
};
