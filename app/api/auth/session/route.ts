import { NextResponse } from 'next/server';
import { getSession } from '@/lib/services/authService';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ success: false, loggedIn: false });
  }
  return NextResponse.json({
    success: true,
    loggedIn: true,
    user: {
      id: session.userId,
      tenantId: session.tenantId,
      email: session.email,
    },
  });
}
