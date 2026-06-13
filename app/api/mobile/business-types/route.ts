import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';

export async function GET() {
  try {
    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('business_types')
      .select(
        'id, name, description, icon, business_categories(id, name, description, image_url)',
      )
      .is('deleted_at', null)
      .is('business_categories.deleted_at', null)
      .order('name');

    if (error) return loggedServerError('mobile/business-types', error);

    return successResponse({ business_types: data });
  } catch {
    return generalErrorResponse();
  }
}
