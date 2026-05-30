import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import { NextResponse } from 'next/server';

// GET all business types with their categories
export async function GET() {
  const { data, error } = await businessService.getBusinessTypes();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// CREATE a new business type
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await businessService.createBusinessType(body);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }
}
