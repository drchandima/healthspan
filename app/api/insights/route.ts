import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/authService';
import { healthStoreRepository } from '@/lib/repositories/healthStoreRepository';
import { generateInsights } from '@/lib/insights';
import { toHttpError } from '@/lib/http';

/**
 * GET /api/insights — compute deterministic Health Score + rule-based findings,
 * then enrich with plain-language explanations when an LLM provider is
 * configured (otherwise a labelled deterministic fallback).
 *
 * Requires an authenticated session. The score/status/trends are computed
 * server-side, deterministically, from the authenticated user's own store, and
 * are never influenced by the LLM. Results are computed on demand and never
 * persisted.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const store = await healthStoreRepository.load(session.userId, session.tenantId);
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'No data found for account' },
        { status: 404 }
      );
    }

    const result = await generateInsights(store);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('Error in insights API:', err);
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}