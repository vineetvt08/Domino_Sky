import type { IncomingMessage, ServerResponse } from 'http';
import { generateDispatcherRecommendation } from './gemini';
import { applySecurityHeaders } from './securityHeaders';
import { dispatchRateLimiter } from './rateLimiter';
import { validateDispatchRequestBody } from './requestValidator';

const MAX_BODY_BYTES = 256 * 1024; // 256 KB maximum payload size

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
]);

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    const first = forwarded.split(',')[0];
    if (first && first.trim()) return first.trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function handleCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  if (!origin) {
    // Same-origin or non-browser request
    return true;
  }

  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }

  // Unauthorized cross-origin request
  return false;
}

export async function handleDispatchApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // Always apply defensive security headers first
  applySecurityHeaders(res);

  // Handle CORS
  const corsAllowed = handleCors(req, res);
  if (!corsAllowed) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Origin not allowed by CORS policy' }));
    return;
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Allow', 'POST, OPTIONS');
    res.end();
    return;
  }

  // Enforce POST method only
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  // Enforce Content-Type
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    res.statusCode = 415;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unsupported Media Type. Content-Type must be application/json.' }));
    return;
  }

  // Enforce per-IP rate limiting (10 req/minute)
  const clientIp = getClientIp(req);
  const rateLimitStatus = dispatchRateLimiter.check(clientIp);
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', String(rateLimitStatus.remaining));

  if (!rateLimitStatus.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(rateLimitStatus.retryAfterSeconds));
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Too many requests. Please wait before requesting another AI recommendation.',
      })
    );
    return;
  }

  // Pre-check Content-Length header against maximum payload size
  const contentLengthHeader = req.headers['content-length'];
  if (contentLengthHeader) {
    const declaredLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Payload too large. Maximum body size is 256KB.' }));
      return;
    }
  }

  // Stream body with strict size ceiling
  let bodyStr = '';
  let receivedBytes = 0;
  let isAborted = false;

  req.on('data', (chunk: Buffer | string) => {
    if (isAborted) return;
    receivedBytes += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;

    if (receivedBytes > MAX_BODY_BYTES) {
      isAborted = true;
      req.destroy();
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Payload too large. Maximum body size is 256KB.' }));
      return;
    }

    bodyStr += chunk;
  });

  req.on('end', async () => {
    if (isAborted) return;

    try {
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(bodyStr || '{}');
      } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Malformed JSON payload in request body.' }));
        return;
      }

      // Validate against strict request schema
      const validation = validateDispatchRequestBody(rawJson);
      if (!validation.valid) {
        console.warn('[Dispatcher API Validation Failed]:', validation.error);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'Invalid request payload structure or parameters.',
          })
        );
        return;
      }

      const { baseResult, topActions, query } = validation.data;

      // Invoke Gemini dispatcher service with deterministic fallback
      const result = await generateDispatcherRecommendation(
        baseResult,
        topActions,
        query
      );

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    } catch (err: unknown) {
      // Server-side logging only; never leak error details or internal state to client
      console.error('[Dispatcher API Error]:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'An internal error occurred while processing the recommendation.',
        })
      );
    }
  });

  req.on('error', (err) => {
    console.error('[Dispatcher API Socket Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Request stream encountered an error.' }));
    }
  });
}
