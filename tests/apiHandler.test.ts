import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { IncomingMessage, ServerResponse } from 'http';
import { handleDispatchApi } from '../server/apiHandler';
import { dispatchRateLimiter } from '../server/rateLimiter';

interface MockResponseState {
  statusCode: number;
  headers: Record<string, string>;
  data: string;
}

function createMockHttp(
  method: string = 'POST',
  headers: Record<string, string> = { 'content-type': 'application/json' },
  ip: string = '127.0.0.1'
): {
  req: IncomingMessage;
  res: ServerResponse;
  responseState: MockResponseState;
  sendPayload: (body: string) => Promise<MockResponseState>;
} {
  const reqEmitter = new EventEmitter() as unknown as IncomingMessage;
  reqEmitter.method = method;
  reqEmitter.headers = { ...headers };
  reqEmitter.socket = { remoteAddress: ip } as any;

  const responseState: MockResponseState = {
    statusCode: 200,
    headers: {},
    data: '',
  };

  const res = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      responseState.headers[name.toLowerCase()] = value;
      return res;
    },
    getHeader(name: string) {
      return responseState.headers[name.toLowerCase()];
    },
    end(data?: string) {
      if (data) responseState.data += data;
      responseState.statusCode = res.statusCode;
      reqEmitter.emit('responseEnd', responseState);
    },
  } as unknown as ServerResponse;

  const sendPayload = (body: string): Promise<MockResponseState> => {
    return new Promise((resolve) => {
      reqEmitter.once('responseEnd', (result: MockResponseState) => {
        resolve(result);
      });

      handleDispatchApi(reqEmitter, res);

      // Emit data in chunks
      process.nextTick(() => {
        reqEmitter.emit('data', Buffer.from(body));
        reqEmitter.emit('end');
      });
    });
  };

  return { req: reqEmitter, res, responseState, sendPayload };
}

describe('/api/dispatch API Route Security & Error Handling', () => {
  beforeEach(() => {
    dispatchRateLimiter.reset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects GET requests with 405 Method Not Allowed and sets Allow: POST', async () => {
    const { req, res, responseState } = createMockHttp('GET');

    await handleDispatchApi(req, res);

    expect(responseState.statusCode).toBe(405);
    expect(responseState.headers['allow']).toBe('POST');
    const parsed = JSON.parse(responseState.data);
    expect(parsed.error).toContain('Method not allowed');
  });

  it('rejects non-JSON Content-Type with 415 Unsupported Media Type', async () => {
    const { req, res, responseState } = createMockHttp('POST', {
      'content-type': 'text/plain',
    });

    await handleDispatchApi(req, res);

    expect(responseState.statusCode).toBe(415);
    const parsed = JSON.parse(responseState.data);
    expect(parsed.error).toContain('Content-Type must be application/json');
  });

  it('rejects malformed JSON body with 400 Bad Request', async () => {
    const { sendPayload } = createMockHttp('POST');
    const result = await sendPayload('{ "invalidJson: true ');

    expect(result.statusCode).toBe(400);
    const parsed = JSON.parse(result.data);
    expect(parsed.error).toContain('Malformed JSON payload');
  });

  it('rejects missing baseResult or topActions with 400 Bad Request', async () => {
    const { sendPayload } = createMockHttp('POST');
    const result = await sendPayload(JSON.stringify({ query: 'hello' }));

    expect(result.statusCode).toBe(400);
    const parsed = JSON.parse(result.data);
    expect(parsed.error).toContain('Invalid request payload');
  });

  it('rejects unknown / unexpected extra fields in strict schema mode', async () => {
    const { sendPayload } = createMockHttp('POST');
    const result = await sendPayload(
      JSON.stringify({
        baseResult: { closures: [], kpis: {}, flights: {} },
        topActions: [],
        maliciousExtraField: 'attack_payload',
      })
    );

    expect(result.statusCode).toBe(400);
    const parsed = JSON.parse(result.data);
    expect(parsed.error).toContain('Invalid request payload');
  });

  it('rejects oversized request bodies exceeding 256KB with 413 Payload Too Large', async () => {
    const { req, res, responseState } = createMockHttp('POST', {
      'content-type': 'application/json',
      'content-length': '300000', // > 256KB
    });

    await handleDispatchApi(req, res);

    expect(responseState.statusCode).toBe(413);
    const parsed = JSON.parse(responseState.data);
    expect(parsed.error).toContain('Payload too large');
  });

  it('enforces per-IP rate limit: allows 10 calls, blocks 11th with 429 Too Many Requests', async () => {
    const testIp = '192.168.1.100';

    for (let i = 1; i <= 10; i++) {
      const { responseState, sendPayload } = createMockHttp(
        'POST',
        { 'content-type': 'application/json' },
        testIp
      );
      // Valid dummy payload will fail at schema or pass, but tests rate limiting
      await sendPayload(JSON.stringify({ invalid: true }));
      expect(responseState.statusCode).toBe(400);
      expect(responseState.headers['x-ratelimit-remaining']).toBe(String(10 - i));
    }

    // 11th call must be blocked with 429
    const { responseState, sendPayload } = createMockHttp(
      'POST',
      { 'content-type': 'application/json' },
      testIp
    );
    const result = await sendPayload(JSON.stringify({ query: 'test' }));

    expect(result.statusCode).toBe(429);
    expect(responseState.headers['retry-after']).toBeDefined();
    const parsed = JSON.parse(result.data);
    expect(parsed.error).toContain('Too many requests');
  });

  it('applies defensive security headers to all responses', async () => {
    const { req, res, responseState } = createMockHttp('GET');

    await handleDispatchApi(req, res);

    expect(responseState.headers['x-content-type-options']).toBe('nosniff');
    expect(responseState.headers['x-frame-options']).toBe('DENY');
    expect(responseState.headers['content-security-policy']).toContain("default-src 'self'");
    expect(responseState.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});
