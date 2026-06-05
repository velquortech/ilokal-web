'use client';

import { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ChangeEmailForm } from './ChangeEmailForm';
import { MFAEnrollDialog } from './MFAEnrollDialog';
import { unenrollMFAAction } from '../../actions/mfaActions';
import { useBusinessShop } from '@/providers/BusinessProvider';
import type { MFAFactor } from '@/lib/types';

interface SecurityTabProps {
  initialFactors: MFAFactor[];
}

export function SecurityTab({ initialFactors }: SecurityTabProps) {
  const { business } = useBusinessShop();
  const [factors, setFactors] = useState<MFAFactor[]>(initialFactors);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [unenrollError, setUnenrollError] = useState('');
  const [unenrolling, setUnenrolling] = useState(false);

  const verifiedFactor = factors.find((f) => f.status === 'verified');

  async function handleUnenroll(factorId: string) {
    if (!business?.id) return;
    setUnenrolling(true);
    setUnenrollError('');
    const result = await unenrollMFAAction(business.id, factorId);
    setUnenrolling(false);
    if (result.success) {
      setFactors((prev) => prev.filter((f) => f.id !== factorId));
    } else {
      setUnenrollError(
        result.error?.message ?? 'Failed to remove authenticator',
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ChangePasswordForm />
      <ChangeEmailForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security by requiring a one-time code from
            your authenticator app when signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {verifiedFactor ? (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-primary h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">
                    {verifiedFactor.friendly_name ?? 'Authenticator App'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Added{' '}
                    {new Date(verifiedFactor.created_at).toLocaleDateString(
                      'en-US',
                      {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      },
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="text-primary border-primary/30 bg-primary/10"
                >
                  Active
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unenrolling}
                  onClick={() => handleUnenroll(verifiedFactor.id)}
                >
                  <ShieldOff className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
              <div className="flex items-center gap-3">
                <ShieldOff className="text-muted-foreground h-5 w-5" />
                <p className="text-muted-foreground text-sm">
                  No authenticator app linked
                </p>
              </div>
              <Button size="sm" onClick={() => setEnrollOpen(true)}>
                Enable 2FA
              </Button>
            </div>
          )}
          {unenrollError && (
            <Alert variant="destructive">
              <AlertDescription>{unenrollError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <MFAEnrollDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        onSuccess={() =>
          setFactors((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              friendly_name: 'Authenticator App',
              factor_type: 'totp',
              status: 'verified',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
        }
      />
    </div>
  );
}
