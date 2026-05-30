import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import { NextResponse } from 'next/server';

type Context = {
  params: Promise<{ id: string }>;
};

// UPDATE a business type
export async function PATCH(request: Request, { params }: Context) {
  const body = await request.json();
  const { id } = await params;
  const { data, error } = await businessService.updateBusinessType(id, body);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// SOFT DELETE a business type
export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params;
  const { error } = await businessService.softDeleteBusinessType(id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Deleted successfully' });
}
