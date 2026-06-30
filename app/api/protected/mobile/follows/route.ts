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
        businesses(
          id, shop_name, description, logo_url, status,
          business_category,
          business_categories!category_id(name, business_types!business_type_id(name))
        )
      `,
      )
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) return loggedServerError('protected/mobile/follows', error);

    // Flatten the joined category the same way the business-detail endpoint does:
    // prefer the relational business_categories row, fall back to the legacy
    // business_category jsonb. Mobile uses { name, business_type } to drive the
    // followed-businesses type/category filter.
    type CategoryRow = {
      name: string;
      business_types: { name: string } | null;
    } | null;
    type JsonbCategory = { type?: string; name: string } | null;

    const follows = (data ?? []).map((row) => {
      const biz = row.businesses as unknown as {
        id: string;
        shop_name: string;
        description: string | null;
        logo_url: string | null;
        status: string;
        business_category: unknown;
        business_categories: CategoryRow;
      } | null;
      if (!biz)
        return { id: row.id, created_at: row.created_at, businesses: null };

      const categoryRow = biz.business_categories;
      const jsonbCategory = biz.business_category as JsonbCategory;
      const category = categoryRow
        ? {
            name: categoryRow.name,
            business_type: categoryRow.business_types?.name ?? null,
          }
        : jsonbCategory?.name
          ? { name: jsonbCategory.name, business_type: null }
          : null;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { business_categories, business_category, ...rest } = biz;
      return {
        id: row.id,
        created_at: row.created_at,
        businesses: { ...rest, category },
      };
    });

    return successResponse({ follows });
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
