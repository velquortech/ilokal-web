import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { NextResponse } from 'next/server';

// GET all business types with their categories (public)
export async function GET() {
  const { data, error } = await businessService.getBusinessTypes();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// CREATE a new business type (admin only)
export async function POST(request: Request) {
  try {
    const auth = await assertAuthorized(undefined, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const body = await request.json();
    const { data, error } = await businessService.createBusinessType(body);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }
}
