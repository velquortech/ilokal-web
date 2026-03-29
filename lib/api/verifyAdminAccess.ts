import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';

export async function verifyAdminAccess(_request: NextRequest): Promise<{
  authorized: boolean;
  error?: NextResponse;
}> {
  const result = await assertAuthorized(_request, { roles: ['admin'] });

  if (!result.authorized) {
    return { authorized: false, error: result.error };
  }

  return { authorized: true };
}
