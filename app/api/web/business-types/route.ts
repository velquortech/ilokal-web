import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { NextResponse } from 'next/server';

// GET all business types with their categories (public)
export async function GET() {
  const { data, error } = await businessService.getBusinessTypes();

  if (error) {
    console.error('[GET /api/web/business-types]', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch business types' },
      { status: 500 },
    );
  }
  return NextResponse.json(data);
}

// CREATE a new business type (admin only)
export async function POST(request: Request) {
  try {
    const auth = await assertAuthorized(undefined, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const body = await request.json();
    const { data, error } = await businessService.createBusinessType(body);

    if (error) {
      console.error('[POST /api/web/business-types]', error.message);
      return NextResponse.json(
        { error: 'Failed to create business type' },
        { status: 400 },
      );
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[POST /api/web/business-types]', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
