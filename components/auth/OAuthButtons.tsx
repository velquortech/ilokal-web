'use client';

import { useState } from 'react';
import { IconBrandFacebook, IconBrandGoogle } from '@tabler/icons-react';
import { createClient } from '@/config/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

type OAuthButtonsProps = {
  disabled?: boolean;
};

type Provider = 'google' | 'facebook';

export function OAuthButtons({ disabled }: OAuthButtonsProps) {
  const [pending, setPending] = useState<Provider | null>(null);

  async function signInWith(provider: Provider) {
    setPending(provider);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          or continue with
        </span>
        <Separator className="flex-1" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !!pending}
          onClick={() => signInWith('google')}
          className="w-full"
          aria-label="Sign in with Google"
        >
          {pending === 'google' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <IconBrandGoogle className="h-4 w-4" />
          )}
          <span className="ml-2">Google</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={disabled || !!pending}
          onClick={() => signInWith('facebook')}
          className="w-full"
          aria-label="Sign in with Facebook"
        >
          {pending === 'facebook' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <IconBrandFacebook className="h-4 w-4" />
          )}
          <span className="ml-2">Facebook</span>
        </Button>
      </div>
    </div>
  );
}
