import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';

export async function GET() {
  try {
    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('business_types')
      .select(
        'id, name, description, icon, business_categories(id, name, description, image_url)',
      )
      .order('name');

    if (error) return generalErrorResponse({ message: error.message });

    return successResponse({ business_types: data });
  } catch {
    return generalErrorResponse();
  }
}
