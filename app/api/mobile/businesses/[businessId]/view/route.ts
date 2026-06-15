import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

// Record a business profile open (migration 20260611000001). Deduped
// server-side to one view per user per day; the client fire-and-forgets.
// Public path, but a verified Bearer token is required — anonymous "views"
// can't be deduped and would be trivial to inflate.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { businessId } = await params;

    const { error } = await auth.supabase.rpc('record_view', {
      p_business_id: businessId,
    });

    if (error)
      return loggedServerError('mobile/businesses/[businessId]/view', error);

    return successResponse({ message: 'View recorded' });
  } catch {
    return generalErrorResponse();
  }
}
