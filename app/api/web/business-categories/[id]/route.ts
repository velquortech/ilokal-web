import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import { NextResponse } from 'next/server';

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Context) {
  const body = await request.json();
  const { id } = await params;
  const { data, error } = await businessService.updateCategory(id, body);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params;
  const { error } = await businessService.softDeleteCategory(id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Category soft deleted' });
}
