import type { ServerResponse } from 'http';

/**
 * Applies security headers to HTTP responses.
 * Enforces strict Content-Security-Policy, anti-framing, MIME-sniffing protection,
 * and referrer privacy controls.
 */
export function applySecurityHeaders(res: ServerResponse): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking / framing
  res.setHeader('X-Frame-Options', 'DENY');

  // Referrer policy: send origin only on cross-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  // Content Security Policy
  // Prevents inline script injection, restricts connections to self, disables object embeds
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Tailwind inline utility styles
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // Cross-origin isolation controls
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}
