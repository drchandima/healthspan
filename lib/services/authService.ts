import bcrypt from 'bcryptjs';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  updatePassword,
  updateUserProfile,
  setTwoFactorEnabled,
  deleteUserCascade,
  UserRow,
} from '@/lib/repositories/userRepository';
import { UserProfile } from '@/lib/types';
import { ApiError } from '@/lib/http';

const BCRYPT_ROUNDS = 12;
export const SEED_USER_ID = 'usr_admin_01';
export const SEED_TENANT_ID = 'tenant-enterprise-01';

/**
 * Reads the current session (cookie). Returns default logged-out session if none.
 */
export async function getSession(): Promise<
  ReturnType<typeof getIronSession<SessionData>>
> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    throw unauthorizedError();
  }
  return session;
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.isLoggedIn && session.userId ? session.userId : null;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function login(email: string, password: string): Promise<UserRow> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw invalidCredentialsError();
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw invalidCredentialsError();
  }
  await updateLastLogin(user.id);
  return user;
}

export async function signup(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<UserRow> {
  const email = input.email.trim().toLowerCase();
  if (!email || !validateEmail(email)) {
    throw new Error('A valid email is required.');
  }
  if (!input.password || input.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }
  const passwordHash = await hashPassword(input.password);
  return createUser({
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email,
    passwordHash,
    fullName: input.fullName || 'New Patient',
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw unauthorizedError();
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    throw new Error('Current password is incorrect.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }
  const next = await hashPassword(newPassword);
  await updatePassword(userId, next);
}

export async function updateProfile(
  userId: string,
  profile: UserProfile
): Promise<void> {
  await updateUserProfile(userId, profile);
}

export async function update2FA(userId: string, enabled: boolean): Promise<void> {
  await setTwoFactorEnabled(userId, enabled);
}

export async function deleteAccount(userId: string, tenantId: string): Promise<void> {
  await deleteUserCascade(userId, tenantId);
}

export function authorizeProfile(profile: UserProfile): UserProfile {
  return profile;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function invalidCredentialsError(): ApiError {
  return new ApiError('Invalid email or password.', 401);
}

function unauthorizedError(): ApiError {
  return new ApiError('Not authenticated.', 401);
}
