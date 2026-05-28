import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    const { data: redemption, error: fetchError } = await auth.supabase
      .from('user_redemptions')
      .select('id, user_id, is_claimed, expires_at')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .single();

    if (fetchError || !redemption) {
      return notFoundResponse({ message: 'Redemption not found' });
    }

    if (redemption.is_claimed) {
      return badRequestResponse({ message: 'Redemption already claimed' });
    }

    if (redemption.expires_at && new Date(redemption.expires_at) < new Date()) {
      return badRequestResponse({ message: 'Redemption has expired' });
    }

    const { data, error } = await auth.supabase
      .from('user_redemptions')
      .update({ is_claimed: true })
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select('id, is_claimed, redeemed_at, expires_at')
      .single();

    if (error) return generalErrorResponse({ message: error.message });

    return successResponse({ redemption: data });
  } catch {
    return generalErrorResponse();
  }
}
