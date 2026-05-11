import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  notFoundResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        `
        id, shop_name, description, logo_url, interior_images, status,
        branches(id, name, address),
        profiles!owner_id(full_name, email)
      `,
      )
      .eq('id', businessId)
      .eq('status', 'verified')
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return notFoundResponse({ message: 'Business not found' });
    }

    const owner =
      (
        data.profiles as unknown as
          | { full_name: string | null; email: string }[]
          | null
      )?.[0] ?? null;
    const ownerHandle = owner
      ? (owner.full_name?.split(' ')[0] ?? owner.email.split('@')[0])
      : null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profiles, ...rest } = data;

    const business = {
      ...rest,
      logo_url: resolveStorageUrl(supabase, 'shop-logos', data.logo_url),
      interior_images:
        data.interior_images?.map((url: string) =>
          resolveStorageUrl(supabase, 'interior-images', url),
        ) ?? [],
      owner_handle: ownerHandle,
    };

    return successResponse({ business });
  } catch {
    return generalErrorResponse();
  }
}
