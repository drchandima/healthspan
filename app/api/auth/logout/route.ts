import { NextResponse } from 'next/server';
import { getSession } from '@/lib/services/authService';

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
