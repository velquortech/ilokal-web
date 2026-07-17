import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { NextResponse } from 'next/server';

// CREATE a business category (admin only)
export async function POST(request: Request) {
  const auth = await assertAuthorized(undefined, { roles: ['admin'] });
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const { data, error } = await businessService.createCategory(body);

  if (error) {
    console.error('[POST /api/web/business-categories]', error.message);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 400 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}
