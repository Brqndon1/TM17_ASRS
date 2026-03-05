import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import {
  clearSessionCookies,
  getSessionTokenFromRequest,
  revokeSessionByToken,
} from '@/lib/auth/server-auth';

export async function POST(request) {
  try {
    const { db } = getServiceContainer();
    const token = getSessionTokenFromRequest(request);

    if (token) {
      revokeSessionByToken(db, token);
    }

    const response = NextResponse.json({ success: true });
    return clearSessionCookies(response);
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
