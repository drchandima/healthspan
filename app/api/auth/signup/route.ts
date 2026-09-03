import { NextRequest, NextResponse } from 'next/server';
import { getSession, signup } from '@/lib/services/authService';
import { toHttpError } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const user = await signup({
      email: String(body.email || ''),
      password: String(body.password || ''),
      fullName: String(body.fullName || ''),
    });

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
