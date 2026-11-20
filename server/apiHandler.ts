import type { IncomingMessage, ServerResponse } from 'http';
import { generateDispatcherRecommendation } from './gemini';
import { ResultJSON, EvaluatedAction } from '../src/types/engine';

export async function handleDispatchApi(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let bodyStr = '';
  req.on('data', (chunk) => {
    bodyStr += chunk;
  });

  req.on('end', async () => {
    try {
      const body = JSON.parse(bodyStr || '{}');
      const baseResult = body.baseResult as ResultJSON;
      const topActions = body.topActions as EvaluatedAction[];
      const userQuery = body.query as string | undefined;

      if (!baseResult || !topActions) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({ error: 'Missing baseResult or topActions in request payload' })
        );
        return;
      }

      const result = await generateDispatcherRecommendation(
        baseResult,
        topActions,
        userQuery
      );

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    } catch (err: unknown) {
      console.error('Error handling /api/dispatch:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Internal dispatcher API error',
          message: err instanceof Error ? err.message : String(err),
        })
      );
    }
  });
}
