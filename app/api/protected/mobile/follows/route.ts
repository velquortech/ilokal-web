import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  conflictRequestResponse,
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { data, error } = await auth.supabase
      .from('follows')
      .select(
        `
        id, created_at,
        businesses(id, shop_name, description, logo_url, status)
      `,
      )
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) return loggedServerError('protected/mobile/follows', error);

    return successResponse({ follows: data });
  } catch {
    return generalErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { business_id } = body;

    if (!business_id) {
      return badRequestResponse({ message: 'business_id is required' });
    }

    const { data, error } = await auth.supabase
      .from('follows')
      .insert({ user_id: auth.user.id, business_id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return conflictRequestResponse({
          message: 'Already following this business',
        });
      }
      return loggedServerError('protected/mobile/follows', error);
    }

    return successResponse({ follow: data });
  } catch {
    return generalErrorResponse();
  }
}
