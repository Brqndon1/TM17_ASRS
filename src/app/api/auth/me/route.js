import { NextResponse } from 'next/server';
import { getServiceContainer } from '@/lib/container/service-container';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(request) {
  try {
    const { db } = getServiceContainer();
    const auth = requireAuth(request, db, { requireCsrf: false });

    if (auth.error) return auth.error;

    return NextResponse.json({
      user: {
        user_id: auth.user.user_id,
        email: auth.user.email,
        first_name: auth.user.first_name,
        last_name: auth.user.last_name,
        user_type: auth.user.user_type,
        permissions: auth.user.permissions,
      },
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
