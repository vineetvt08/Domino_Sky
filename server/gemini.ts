import { GoogleGenAI } from '@google/genai';
import { ResultJSON, EvaluatedAction } from '../src/types/engine';
import {
  DispatcherAiResponse,
  validateDispatcherResponse,
  buildDeterministicTemplate,
} from './validator';
import { dispatchCache } from './cache';

const SYSTEM_INSTRUCTION = `You are an airline dispatcher assistant. You receive precomputed simulation results as JSON. Explain the situation and justify the provided options in plain language for a dispatcher. You may ONLY quote numbers that appear in the JSON, exactly as given. Never invent, estimate, round, convert or compute any number. Do not add facts about weather, causes or airports that are not in the JSON. Refer to options by their id.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['id', 'rationale'],
      },
    },
    caveats: { type: 'string' },
  },
  required: ['summary', 'options', 'caveats'],
};

function sanitizeUserQuery(rawQuery?: string): string | undefined {
  if (!rawQuery) return undefined;
  // Cap length to 300 characters max
  let clean = rawQuery.trim().slice(0, 300);
  // Strip non-printable ASCII control characters
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Neutralize prompt instruction override delimiters
  clean = clean.replace(/(?:SYSTEM_INSTRUCTION|BEGIN_SYSTEM|END_SYSTEM)/gi, '');
  return clean.length > 0 ? clean : undefined;
}

export interface DispatchResultPayload {
  summary: string;
  options: Array<{
    id: string;
    rationale: string;
  }>;
  caveats: string;
  verifiedNumbersCount: number;
  correctedCount: number;
  isFallback: boolean;
  isCached: boolean;
}

export async function generateDispatcherRecommendation(
  baseResult: ResultJSON,
  topActions: EvaluatedAction[],
  userQuery?: string
): Promise<DispatchResultPayload> {
  const sanitizedQuery = sanitizeUserQuery(userQuery);

  const cacheKey = dispatchCache.computeKey(
    { kpis: baseResult.kpis, closures: baseResult.closures, options: topActions.map((a) => a.action.id) },
    sanitizedQuery || ''
  );

  // Check cache
  const cached = dispatchCache.get<DispatchResultPayload>(cacheKey);
  if (cached) {
    return { ...cached, isCached: true };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not found in environment. Using deterministic fallback.');
    const fallback = buildDeterministicTemplate(baseResult, topActions);
    return {
      ...fallback,
      verifiedNumbersCount: 0,
      correctedCount: 0,
      isFallback: true,
      isCached: false,
    };
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const ai = new GoogleGenAI({ apiKey });

  // Minimal deterministic payload sent to AI
  const inputPayload = {
    baseline_kpis: baseResult.kpis,
    closures: baseResult.closures,
    top_3_options: topActions.map((item) => ({
      id: item.action.id,
      title: item.action.title,
      description: item.action.description,
      before_kpis: item.before_kpis,
      after_kpis: item.after_kpis,
      affected_flights: item.affected_flight_ids,
    })),
    user_query: sanitizedQuery || undefined,
  };

  const basePrompt = `Precomputed Simulation Results:\n${JSON.stringify(inputPayload, null, 2)}`;

  let attempt = 0;
  let currentPrompt = basePrompt;
  let parsedResponse: DispatcherAiResponse | null = null;
  let correctedCount = 0;

  while (attempt < 2) {
    attempt++;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: currentPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          systemInstruction: SYSTEM_INSTRUCTION,
          abortSignal: AbortSignal.timeout(15000), // 15-second timeout
        },
      });

      const responseText = response.text || '';
      parsedResponse = JSON.parse(responseText) as DispatcherAiResponse;

      // Run Number and Option ID Validator
      const report = validateDispatcherResponse(parsedResponse, baseResult, topActions);

      if (report.valid) {
        const result: DispatchResultPayload = {
          ...parsedResponse,
          verifiedNumbersCount: report.totalNumbersChecked,
          correctedCount,
          isFallback: false,
          isCached: false,
        };
        dispatchCache.set(cacheKey, result);
        return result;
      }

      // If invalid on attempt 1, append unmatched figures and retry once
      if (attempt === 1 && report.unmatchedNumbers.length > 0) {
        currentPrompt = `${basePrompt}\n\nERROR IN PREVIOUS RESPONSE: These figures are not in the data, remove them: [${report.unmatchedNumbers.join(
          ', '
        )}]. Only quote exact numbers from the JSON input.`;
        correctedCount += report.unmatchedNumbers.length;
      }
    } catch (err) {
      console.error(`Gemini API attempt ${attempt} failed:`, err);
      break;
    }
  }

  // If still failing or error occurred, use deterministic template
  console.info('Using deterministic template fallback for dispatcher recommendations.');
  const deterministic = buildDeterministicTemplate(baseResult, topActions);
  const result: DispatchResultPayload = {
    ...deterministic,
    verifiedNumbersCount: 0,
    correctedCount: correctedCount > 0 ? correctedCount : 0,
    isFallback: true,
    isCached: false,
  };

  dispatchCache.set(cacheKey, result);
  return result;
}
