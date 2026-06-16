import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  notFoundResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { resolveAppBaseUrl } from '@/app/api/helpers/request-url';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
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

    // Public, OG-tagged landing page (app/s/[businessId]) — NOT the owner
    // dashboard at /business/[businessId], which would dead-end a social visitor.
    // Base URL is derived from the request when NEXT_PUBLIC_APP_URL is unset or
    // localhost, so the APK preview build (cloud API) emits a reachable link.
    const appUrl = resolveAppBaseUrl(req);
    const shareUrl = `${appUrl}/s/${businessId}`;

    return successResponse({
      share_url: shareUrl,
      title: data.shop_name,
      description: data.description ?? '',
      image_url: resolveStorageUrl(supabase, 'shop-logos', data.logo_url) ?? '',
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
