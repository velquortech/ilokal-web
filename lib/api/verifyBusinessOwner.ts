import { createServerSupabaseClient } from '@/supabase/server';

/**
 * Verify the current session belongs to a business owner and return their business
 */
export async function verifyBusinessOwner(): Promise<{
  authorized: boolean;
  error?: { code: string; message: string };
  user?: { id: string };
  business?: { id: string };
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        authorized: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return {
        authorized: false,
        error: { code: 'NOT_FOUND', message: 'Business not found' },
      };
    }

    return {
      authorized: true,
      user: { id: user.id },
      business: { id: business.id },
    };
  } catch (error) {
    console.error('[verifyBusinessOwner] Error:', error);
    return {
      authorized: false,
      error: { code: 'INTERNAL_ERROR', message: 'Authorization failed' },
    };
  }
}

export default verifyBusinessOwner;
