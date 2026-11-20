import { ResultJSON, EvaluatedAction } from '../types/engine';
import { DispatchResultPayload } from '../../server/gemini';
import { buildDeterministicTemplate } from '../../server/validator';

export async function requestDispatcherRecommendation(
  baseResult: ResultJSON,
  topActions: EvaluatedAction[],
  query?: string
): Promise<DispatchResultPayload> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    const res = await fetch('/api/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseResult,
        topActions,
        query,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as DispatchResultPayload;
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('AI Dispatcher route error or offline. Falling back to computed engine templates.', err);

    // Fallback: build deterministic template directly on client
    const fallback = buildDeterministicTemplate(baseResult, topActions);
    return {
      ...fallback,
      verifiedNumbersCount: 0,
      correctedCount: 0,
      isFallback: true,
      isCached: false,
    };
  }
}
