import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  notFoundResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('businesses')
      .select('id, shop_name, description, logo_url')
      .eq('id', businessId)
      .eq('status', 'verified')
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return notFoundResponse({ message: 'Business not found' });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const shareUrl = `${appUrl}/business/${businessId}`;

    return successResponse({
      share_url: shareUrl,
      title: data.shop_name,
      description: data.description ?? '',
      image_url: data.logo_url ?? '',
      platforms: {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(data.shop_name)}`,
        tiktok: shareUrl,
        instagram: shareUrl,
      },
    });
  } catch {
    return generalErrorResponse();
  }
}
