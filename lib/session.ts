import { SessionOptions } from 'iron-session';

/**
 * Type of the data stored in the signed/encrypted session cookie.
 */
export interface SessionData {
  userId: string;
  tenantId: string;
  email: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    'healthspan-dev-session-secret-change-me-0123456789',
  cookieName: 'healthspan_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // 7 days
    maxAge: 60 * 60 * 24 * 7,
  },
};
