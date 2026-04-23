import { createServerSupabaseClient } from '@/supabase/server';

export type BusinessCategoryServiceProps = {
  business_type_id: string;
  name: string;
  description?: string;
  image_url?: string;
};

export type BusinessTypeServiceProps = {
  name: string;
  description?: string;
  icon?: string;
  business_categories: BusinessCategoryServiceProps[];
};

export const businessService = {
  /**
   * BUSINESS TYPES
   */
  async getBusinessTypes() {
    const supabase = await createServerSupabaseClient();
    return await supabase
      .from('business_types')
      .select('*, business_categories(*)')
      .is('deleted_at', null)
      .order('name');
  },

  async createBusinessType(
    data: Omit<BusinessTypeServiceProps, 'business_categories'>,
  ) {
    const supabase = await createServerSupabaseClient();
    return await supabase
      .from('business_types')
      .insert([data])
      .select()
      .single();
  },

  async updateBusinessType(
    id: string,
    data: Partial<{ name: string; description: string; icon: string }>,
  ) {
    const supabase = await createServerSupabaseClient();
    return await supabase
      .from('business_types')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },

  async softDeleteBusinessType(id: string) {
    const supabase = await createServerSupabaseClient();
    return await supabase
      .from('business_types')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },

  /**
   * BUSINESS CATEGORIES
   */
  async getCategoriesByType(typeId: string) {
    const supabase = await createServerSupabaseClient();
    return await supabase
      .from('business_categories')
      .select('*')
      .eq('business_type_id', typeId)
      .is('deleted_at', null);
  },

  async createCategory(data: BusinessCategoryServiceProps) {
    const supabase = await createServerSupabaseClient();
    return await supabase
      .from('business_categories')
      .insert([data])
      .select()
      .single();
  },

  async updateCategory(
    id: string,
    data: Partial<BusinessCategoryServiceProps>,
  ) {
    const supabase = await createServerSupabaseClient();
    return await supabase
      .from('business_categories')
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },

  async softDeleteCategory(id: string) {
    const supabase = await createServerSupabaseClient();
    return await supabase
      .from('business_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },
};
