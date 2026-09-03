import { NextRequest, NextResponse } from 'next/server';
import { getSession, login } from '@/lib/services/authService';
import { toHttpError } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    const user = await login(email, password);

    const session = await getSession();
    session.userId = user.id;
    session.tenantId = user.tenantId;
    session.email = user.email;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      success: true,
      user: { id: user.id, tenantId: user.tenantId, email: user.email },
    });
  } catch (err) {
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}
