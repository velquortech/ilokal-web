import { NextRequest } from 'next/server';
import { createClient } from '@/config/index';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  conflictRequestResponse,
} from '../../helpers/response';
import {
  validateSignupData,
  getValidationErrorMessage,
} from '../../helpers/authValidation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input using reusable validation schema
    const validationResult = validateSignupData(body);

    if (!validationResult.success) {
      return badRequestResponse({
        message: getValidationErrorMessage(validationResult.error.issues),
      });
    }

    const { email, password, name, role } = validationResult.data;
    const phoneNumber = body.phone_number;
    const supabase = await createClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return conflictRequestResponse({
        message: 'Email already registered',
      });
    }

    // Sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return generalErrorResponse({
        message: authError.message,
      });
    }

    if (!authData.user) {
      return generalErrorResponse({
        message: 'Failed to create user',
      });
    }

    // Create profile in database
    const profileData: Record<string, unknown> = {
      id: authData.user.id,
      email,
      full_name: name,
      role,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (phoneNumber && /\d/.test(phoneNumber)) {
      profileData.phone_number = phoneNumber;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      return generalErrorResponse({
        message: profileError.message,
      });
    }

    return successResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        full_name: name,
        phone_number: phoneNumber || null,
        role: role,
        avatar_url: null,
      },
      message: 'Account created successfully. Please verify your email.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return generalErrorResponse({
      message: 'An unexpected error occurred during signup',
    });
  }
}
