import { createServerSupabaseClient } from '@/config/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const action = pathname.split('/').pop();

  const supabase = await createServerSupabaseClient();

  try {
    if (action === 'signup') {
      const { email, password, name, role } = await request.json();

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
        },
      });

      if (authError) {
        return NextResponse.json(
          { message: authError.message },
          { status: 400 },
        );
      }

      // Create profile in database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user?.id,
          email,
          full_name: name,
          role,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        return NextResponse.json(
          { message: profileError.message },
          { status: 400 },
        );
      }

      return NextResponse.json({
        user: profile,
        message: 'Signup successful',
      });
    }

    if (action === 'login') {
      const { email, password } = await request.json();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 401 });
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select()
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        return NextResponse.json(
          { message: profileError.message },
          { status: 400 },
        );
      }

      return NextResponse.json({
        user: profile,
        message: 'Login successful',
      });
    }

    if (action === 'logout') {
      await supabase.auth.signOut();
      return NextResponse.json({ message: 'Logout successful' });
    }

    if (action === 'verify') {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        return NextResponse.json({ user: null });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select()
        .eq('id', data.session.user.id)
        .single();

      return NextResponse.json({ user: profile });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
