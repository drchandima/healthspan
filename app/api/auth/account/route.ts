import { NextRequest, NextResponse } from 'next/server';
import {
  requireSession,
  getSession,
  getCurrentUserId,
  updateProfile,
  update2FA,
  deleteAccount,
  authorizeProfile,
} from '@/lib/services/authService';
import { UserProfile } from '@/lib/types';
import { ApiError, toHttpError } from '@/lib/http';

/**
 * GET /api/auth/account — return current user's profile (used to populate store).
 * PATCH /api/auth/account — update profile and/or 2FA setting.
 * DELETE /api/auth/account — permanently delete the account and its data.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.profile) {
      const profile = authorizeProfile(normalizeProfile(body.profile as ProfileInput));
      await updateProfile(session.userId, profile);
    }
    if (typeof body.twoFactorEnabled === 'boolean') {
      await update2FA(session.userId, body.twoFactorEnabled);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    await deleteAccount(session.userId, session.tenantId);
    const s = await getSession();
    await s.destroy();
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, loggedIn: false }, { status: 401 });
  }
  return NextResponse.json({ success: true, loggedIn: true });
}

interface ProfileInput {
  fullName?: unknown;
  dob?: unknown;
  gender?: unknown;
  ethnicity?: unknown;
  baselineBiometrics?: Partial<{
    initialHeightCm: number;
    initialWeightKg: number;
    baselineBloodPressure: string;
  }>;
}

function normalizeProfile(body: ProfileInput): UserProfile {
  const b = body.baselineBiometrics || {};
  const gender = ['male', 'female', 'other'].includes(String(body.gender))
    ? String(body.gender)
    : 'other';
  return {
    fullName: String(body.fullName || ''),
    dob: String(body.dob || ''),
    gender: gender as UserProfile['gender'],
    ethnicity: String(body.ethnicity || ''),
    baselineBiometrics: {
      initialHeightCm: Number(b.initialHeightCm) || 178,
      initialWeightKg: Number(b.initialWeightKg) || 76,
      baselineBloodPressure: String(b.baselineBloodPressure || '120/80'),
    },
  };
}
