import { NextRequest, NextResponse } from 'next/server';
import { requireSession, changePassword } from '@/lib/services/authService';
import { toHttpError } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as Record<string, unknown>;
    await changePassword(
      session.userId,
      String(body.currentPassword || ''),
      String(body.newPassword || '')
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}
