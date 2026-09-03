import { RawLabReportExtraction } from '@/lib/types';

/**
 * Client for any OpenAI-compatible chat-completions endpoint (OpenAI, Azure,
 * Together, Groq, local Ollama, etc.). No vendor SDK is required — only a
 * standard `fetch` and the base URL + key + model env vars.
 *
 * This module is server-only by convention; it must never be imported from a
 * client component.
 */

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_PROVIDER_API_KEY);
}

export function llmConfig() {
  return {
    baseUrl: (process.env.LLM_PROVIDER_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    apiKey: process.env.LLM_PROVIDER_API_KEY || '',
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
  };
}

const SYSTEM_PROMPT = `You are a medical laboratory report parser. Extract structured data from the OCR text of a laboratory report.

Return ONLY valid JSON with this exact shape (no markdown, no commentary):
{
  "patient": {
    "patientName": "string or null",
    "patientId": "string or null",
    "dateOfBirth": "YYYY-MM-DD or null",
    "confidence": "number 0-100 based on how clearly the patient block was read"
  },
  "testDate": "YYYY-MM-DD or null (the date the test was performed, if present)",
  "laboratory": "string or null (the laboratory / provider name)",
  "fields": [
    {
      "testName": "the biomarker name, e.g. 'Fasting Blood Sugar'",
      "value": "the numeric result as a string, preserving the original number",
      "unit": "unit, e.g. 'mg/dL', or null",
      "referenceMin": "numeric reference range lower bound as string, or null",
      "referenceMax": "numeric reference range upper bound as string, or null",
      "confidence": "number 0-100, how confident you are that this value/name/unit were read correctly",
      "rawValue": "the exact text fragment you based the value on",
      "note": "brief plain-language note, or null"
    }
  ]
}

Rules:
- Map test names to standard HealthSpan names when obvious, e.g. 'Fasting Blood Sugar', 'HbA1c', 'Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol', 'Triglycerides', 'Serum Creatinine (S/Cr)', 'eGFR', 'Blood Urea Nitrogen (BUN)', 'ALT (SGPT)', 'AST (SGOT)', 'Total Bilirubin', 'Hemoglobin', 'Hematocrit', 'Red Blood Cell (RBC)'.
- Estimate a numeric confidence for EVERY field. Mark a value/name/unit as low confidence (e.g. < 85) when the text is blurry, garbled, ambiguous, or you are unsure.
- Never invent biomarkers that are not present in the text.
- Numeric "value" and "referenceMin"/"referenceMax" must remain strings in the output.`;

function sanitizeJson(raw: string): string {
  let content = raw.trim();
  // Strip markdown code fences if present.
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) content = fence[1].trim();
  // Trim leading non-{ characters defensively.
  const open = content.indexOf('{');
  if (open > 0) content = content.slice(open);
  return content;
}

export async function extractWithLlm(text: string): Promise<RawLabReportExtraction> {
  const { baseUrl, apiKey, model } = llmConfig();
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
        content: `Extract the laboratory report data from the following OCR text and return the JSON:\n\n"""\n${text}\n"""`,
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

  const parsed = JSON.parse(sanitizeJson(content)) as RawLabReportExtraction;
  if (!parsed || !Array.isArray(parsed.fields)) {
    throw new Error('LLM provider returned an unexpected shape.');
  }
  return {
    patient: parsed.patient,
    testDate: parsed.testDate,
    laboratory: parsed.laboratory,
    fields: parsed.fields,
  };
}
