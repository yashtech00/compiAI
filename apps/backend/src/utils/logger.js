/**
 * Structured, privacy-conscious logger with automatic credential & token redaction
 */

const SENSITIVE_KEYS = new Set([
  'apikey',
  'geminiapikey',
  'openaiapikey',
  'anthropicapikey',
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'jwtsecret',
  'cookiesecret',
  'stripesecretkey',
  'authorization',
  'cookie'
]);

const SENSITIVE_PATTERNS = [
  /AIza[0-9A-Za-z\-_]{35}/g, // Google / Gemini API keys
  /Bearer\s+[A-Za-z0-9_\-.]+/gi, // Bearer tokens
  /[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}/g // JWT tokens
];

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  let sanitized = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_CREDENTIAL]');
  }
  return sanitized;
}

export function sanitizeLogData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return sanitizeString(data);
  if (typeof data === 'number' || typeof data === 'boolean') return data;
  if (data instanceof Error) {
    return {
      name: data.name,
      message: sanitizeString(data.message),
      stack: process.env.NODE_ENV === 'development' ? sanitizeString(data.stack) : undefined
    };
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  if (typeof data === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = sanitizeLogData(value);
      }
    }
    return cleaned;
  }

  return data;
}

export const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message: sanitizeString(message),
      ...sanitizeLogData(meta)
    }));
  },
  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message: sanitizeString(message),
      ...sanitizeLogData(meta)
    }));
  },
  error: (message, error = null, meta = {}) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message: sanitizeString(message),
      error: error ? sanitizeLogData(error) : undefined,
      ...sanitizeLogData(meta)
    }));
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'DEBUG',
        timestamp: new Date().toISOString(),
        message: sanitizeString(message),
        ...sanitizeLogData(meta)
      }));
    }
  }
};
