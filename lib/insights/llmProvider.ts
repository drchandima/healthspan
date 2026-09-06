import { StructuredEvidence, RawEnrichedInsight } from './types';

/**
 * Client for any OpenAI-compatible chat-completions endpoint (Gemini OpenAI
 * compatibility mode, OpenAI, Groq, local Ollama, etc.). No vendor SDK is
 * required — only a standard `fetch` and the base URL + key + model env vars.
 *
 * This module is server-only by convention; it must never be imported from a
 * client component.
 *
 * The LLM is deliberately constrained to EXPLAIN the deterministic evidence it
 * is handed. It never computes values, reference ranges, trends, or diagnoses.
 */

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

export function isInsightsLlmConfigured(): boolean {
  return Boolean(process.env.LLM_PROVIDER_API_KEY);
}

export function insightsLlmConfig() {
  return {
    baseUrl: (process.env.LLM_PROVIDER_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    apiKey: process.env.LLM_PROVIDER_API_KEY || '',
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
  };
}

const SYSTEM_PROMPT = `You are HealthSpan's explanation assistant. Your ONLY job is to convert the supplied structured health evidence into clear, safe, plain-language explanations. You are decision-support, never a diagnosis.

Return ONLY valid JSON with this exact shape (no markdown, no commentary, no code fence):
{
  "findings": [
    {
      "sourceId": "the matching finding id from the input, or null",
      "title": "a concise restatement of the deterministic finding title",
      "summary": "a short plain-language explanation of the finding",
      "doctorConsultReason": "a short plain-language reason to consult a doctor, ONLY if the finding is warning/critical, else null"
    }
  ],
  "suggestions": ["general lifestyle guidance, non-medical, max 3"]
}

Rules:
- Use ONLY the numbers and statuses already present in the evidence. NEVER invent, estimate, or repeat values that are not given.
- NEVER compute reference ranges, percentages, or trends yourself.
- NEVER claim a diagnosis (e.g. do not say "you have diabetes").
- For concerning (warning/critical) findings use cautious language such as "the current pattern may indicate increased risk; consider discussing it with a qualified healthcare professional".
- Distinguish general lifestyle guidance from medical advice.
- Keep summaries short and grounded in the evidence.
- If you cannot explain something from the evidence, omit it rather than guessing.`;

export function sanitizeJson(raw: string): string {
  let content = raw.trim();
  // Strip markdown code fences if present.
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) content = fence[1].trim();
  // Trim leading non-{ characters defensively.
  const open = content.indexOf('{');
  if (open > 0) content = content.slice(open);
  return content;
}

export async function enrichEvidenceWithLlm(evidence: StructuredEvidence): Promise<RawEnrichedInsight> {
  const { baseUrl, apiKey, model } = insightsLlmConfig();
  if (!apiKey) {
    throw new Error('LLM provider is not configured (LLM_PROVIDER_API_KEY is missing).');
  }

  const body = {
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Explain this structured health evidence. Return the JSON.\n\n${JSON.stringify(evidence)}`,
      },
    ],
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM provider request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string =
    data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '';

  return JSON.parse(sanitizeJson(content)) as RawEnrichedInsight;
}