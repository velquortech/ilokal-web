import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { redemptionErrorResponse } from '@/app/api/helpers/redemptionErrors';
import { isValidResourceId } from '@/app/api/helpers/resourceId';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

const CONTEXT = 'protected/mobile/redemptions/[id]/claim';

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidResourceId(id)) {
      return notFoundResponse({ message: 'Redemption not found' });
    }

    // Own row, unclaimed → claimed, not expired — enforced by the RPC
    // (migration 20261024000000). Clients can no longer UPDATE
    // user_redemptions directly, so a claim can't be flipped back.
    const { data, error } = await auth.supabase.rpc('claim_my_redemption', {
      p_redemption_id: id,
    });

    if (error) return redemptionErrorResponse(CONTEXT, error, auth.user.id);

    return successResponse({
      redemption: {
        id: data.id,
        is_claimed: data.is_claimed,
        redeemed_at: data.redeemed_at,
        expires_at: data.expires_at,
      },
    });
  } catch {
    return generalErrorResponse();
  }
}
