import { NextRequest } from 'next/server';
import { createClient } from '@/config/index';
import { generalErrorResponse, successResponse } from '../../helpers/response';

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient();

    // Sign out
    const { error } = await supabase.auth.signOut();

    if (error) {
      return generalErrorResponse({
        message: error.message,
      });
    }

    return successResponse({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return generalErrorResponse({
      message: 'An unexpected error occurred during logout',
    });
  }
}
