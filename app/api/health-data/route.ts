import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/authService';
import { healthStoreRepository } from '@/lib/repositories/healthStoreRepository';
import { deleteUserCascade } from '@/lib/repositories/userRepository';
import { HealthSpanStore } from '@/lib/types';
import { toHttpError } from '@/lib/http';

/**
 * GET  /api/health-data  — load the authenticated user's aggregate from PG.
 * POST /api/health-data  — persist the authenticated user's aggregate to PG.
 * DELETE /api/health-data — permanently delete the user's account and data.
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
    return NextResponse.json({ success: true, store });
  } catch (err) {
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as { store?: HealthSpanStore } | HealthSpanStore;
    const store = body && typeof body === 'object' ? (body as { store?: HealthSpanStore }).store ?? (body as HealthSpanStore) : undefined;
    if (!store || typeof store !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid store payload' },
        { status: 400 }
      );
    }

    // Enforce ownership: never trust userId/tenantId from the client body.
    store.userId = session.userId;
    store.tenantId = session.tenantId;

    await healthStoreRepository.save(store);
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    await deleteUserCascade(session.userId, session.tenantId);
    return NextResponse.json({
      success: true,
      message: 'Account and health records deleted permanently',
    });
  } catch (err) {
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}
