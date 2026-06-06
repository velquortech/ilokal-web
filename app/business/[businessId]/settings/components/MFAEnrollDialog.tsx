'use client';

import { useState } from 'react';
import {
  enrollMFAAction,
  verifyMFAEnrollmentAction,
} from '@/app/business/[businessId]/actions/mfaActions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';

interface MFAEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'qr' | 'verify';

export function MFAEnrollDialog({
  open,
  onOpenChange,
  onSuccess,
}: MFAEnrollDialogProps) {
  const [step, setStep] = useState<Step>('qr');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEnroll() {
    setLoading(true);
    setError('');
    const result = await enrollMFAAction();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setFactorId(result.factorId);
    setQrCode(result.qrCode);
    setSecret(result.secret);
    setStep('verify');
  }

  async function handleVerify() {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setLoading(true);
    setError('');
    const result = await verifyMFAEnrollmentAction(factorId, code);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Verification failed');
      return;
    }
    setStep('qr');
    setCode('');
    setQrCode('');
    setSecret('');
    onSuccess();
    onOpenChange(false);
  }

  function handleClose(open: boolean) {
    if (!open) {
      setStep('qr');
      setCode('');
      setError('');
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            {step === 'qr'
              ? 'Scan the QR code with your authenticator app, then enter the code to verify.'
              : 'Enter the 6-digit code shown in your authenticator app.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'qr' && (
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={handleEnroll}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating QR code...' : 'Generate QR Code'}
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="flex flex-col gap-4">
            {qrCode && (
              <div className="flex flex-col items-center gap-2">
                <Image
                  src={qrCode}
                  alt="TOTP QR code"
                  width={200}
                  height={200}
                  unoptimized
                  className="rounded-lg border"
                />
                <p className="text-muted-foreground text-xs">
                  Can&apos;t scan? Use this secret:{' '}
                  <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                    {secret}
                  </code>
                </p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="otp-code">Verification Code</Label>
              <Input
                id="otp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                className="text-center font-mono tracking-widest"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        )}

        {step === 'qr' && error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
