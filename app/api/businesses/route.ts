import { NextResponse } from 'next/server';
import { getMyBusinesses, createBusiness } from '@/lib/api/business/business';

// GET: /api/businesses
export async function GET() {
  try {
    const businesses = await getMyBusinesses();
    return NextResponse.json(businesses);
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}

// POST: /api/businesses
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const newBusiness = await createBusiness(formData);
    return NextResponse.json(newBusiness, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 400 });
  }
}
