import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await businessService.createCategory(body);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
