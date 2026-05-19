import { getMobileUser } from '@/app/api/helpers/mobile-auth';
import {
  badRequestResponse,
  conflictRequestResponse,
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { data, error } = await auth.supabase
      .from('subscriptions')
      .select(
        `
        id, created_at,
        businesses(id, shop_name, description, logo_url, status)
      `,
      )
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) return generalErrorResponse({ message: error.message });

    return successResponse({ subscriptions: data });
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
      .from('subscriptions')
      .insert({ user_id: auth.user.id, business_id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return conflictRequestResponse({
          message: 'Already subscribed to this business',
        });
      }
      return generalErrorResponse({ message: error.message });
    }

    return successResponse({ subscription: data });
  } catch {
    return generalErrorResponse();
  }
}
