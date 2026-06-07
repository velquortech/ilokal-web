import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { businessId } = await params;

    const { error, count } = await auth.supabase
      .from('follows')
      .delete({ count: 'exact' })
      .eq('user_id', auth.user.id)
      .eq('business_id', businessId);

    if (error) return generalErrorResponse({ message: error.message });
    if (count === 0) return notFoundResponse({ message: 'Follow not found' });

    return successResponse({ message: 'Unfollowed successfully' });
  } catch {
    return generalErrorResponse();
  }
}
