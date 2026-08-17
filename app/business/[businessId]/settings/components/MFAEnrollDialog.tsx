'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

interface MFAEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
}

type Step = 'qr' | 'verify';

/**
 * Belt-and-braces: `enrollMFAAction` already returns a data URL, but GoTrue's
 * `totp.qr_code` is RAW SVG markup — and next/image rejects a src ending in a
 * control character ("cannot end with a space or control character"), while a
 * plain <img> would fetch it as a relative path and 404. Never let raw markup
 * reach the DOM, whatever the server hands back.
 */
function toQrSrc(qrCode: string): string {
  if (!qrCode || qrCode.startsWith('data:')) return qrCode;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`;
}

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
  // Starts true: the dialog auto-enrolls on open, and the effect only runs
  // after the first commit — `false` would paint a "Try again" button before
  // anything had been tried.
  const [loading, setLoading] = useState(true);

  // Guards React 18 StrictMode's double-effect (and a fast reopen) from firing
  // two enrollments — the second would be rejected as a duplicate factor.
  const enrolling = useRef(false);

  const handleEnroll = useCallback(async () => {
    if (enrolling.current) return;
    enrolling.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await enrollMFAAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setFactorId(result.factorId);
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStep('verify');
    } finally {
      enrolling.current = false;
      setLoading(false);
    }
  }, []);

  // Generate the QR as soon as the dialog opens — the old flow made the user
  // click "Generate QR Code" first, for no reason.
  useEffect(() => {
    if (open && step === 'qr' && !qrCode) void handleEnroll();
  }, [open, step, qrCode, handleEnroll]);

  async function handleVerify() {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setLoading(true);
    setError('');
    const result = await verifyMFAEnrollmentAction(factorId, code);
    if (!result.success) {
      setLoading(false);
      setError(result.error ?? 'Verification failed');
      return;
    }

    // Await the parent's refetch BEFORE closing: it's what turns the settings
    // card from "No authenticator app linked" into the enrolled state, and an
    // unawaited rejection here would both leave the card lying and surface as
    // an unhandled rejection.
    try {
      await onSuccess();
    } catch (err) {
      setLoading(false);
      console.error(
        '[MFAEnrollDialog] post-enroll refresh failed:',
        formatErrorForLog(err),
      );
      setError(
        'Two-factor authentication is enabled, but the page could not be refreshed. Reload to see it.',
      );
      return;
    }

    setLoading(false);
    setStep('qr');
    setCode('');
    setQrCode('');
    setSecret('');
    onOpenChange(false);
  }

  function handleClose(open: boolean) {
    if (!open) {
      // Drop the pending factor too: an abandoned enrollment leaves an
      // unverified factor behind, and the next enroll cleans it up and mints a
      // fresh one — so reopening must NOT reuse the stale QR/factorId.
      setStep('qr');
      setCode('');
      setError('');
      setFactorId('');
      setQrCode('');
      setSecret('');
      // Reopening auto-enrolls again, so the next mount must start busy.
      setLoading(true);
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
            {loading ? (
              <div
                role="status"
                aria-busy="true"
                className="flex flex-col items-center gap-3 py-6"
              >
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Generating QR code…
                </p>
              </div>
            ) : (
              // Only reachable after a failed enroll (the effect flips `loading`
              // on open), so the retry label is always accurate here.
              error && (
                <Button onClick={handleEnroll} className="w-full">
                  Try again
                </Button>
              )
            )}
          </div>
        )}

        {step === 'verify' && (
          <div className="flex flex-col gap-4">
            {qrCode && (
              <div className="flex flex-col items-center gap-2">
                <Image
                  src={toQrSrc(qrCode)}
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
