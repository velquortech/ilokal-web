'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  deactivateBusinessAction,
  deleteAccountAction,
} from '../../actions/settingsActions';
import { useBusinessShop } from '@/providers/BusinessProvider';

export function DangerZoneTab() {
  const { business } = useBusinessShop();
  const router = useRouter();

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateInput, setDeactivateInput] = useState('');
  const [deactivateError, setDeactivateError] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDeactivate() {
    if (!business?.id) return;
    if (deactivateInput !== 'DEACTIVATE') {
      setDeactivateError('Type DEACTIVATE to confirm');
      return;
    }
    setDeactivating(true);
    setDeactivateError('');
    const result = await deactivateBusinessAction(business.id, {
      confirmation: 'DEACTIVATE',
    });
    setDeactivating(false);
    if (result.success) {
      setDeactivateOpen(false);
      router.push('/business');
    } else {
      setDeactivateError(result.error?.message ?? 'Failed to deactivate');
    }
  }

  async function handleDelete() {
    if (!business?.id) return;
    if (deleteInput !== 'DELETE') {
      setDeleteError('Type DELETE to confirm');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    const result = await deleteAccountAction(business.id, {
      password: deletePassword,
      confirmation: 'DELETE',
    });
    setDeleting(false);
    if (result.success) {
      router.push('/login');
    } else {
      setDeleteError(result.error?.message ?? 'Failed to delete account');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base text-destructive">
              Danger Zone
            </CardTitle>
          </div>
          <CardDescription>
            Actions here are irreversible. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Deactivate Business</p>
              <p className="text-muted-foreground text-xs">
                Hides your business from the app. You can reactivate by
                contacting support.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeactivateOpen(true)}
            >
              Deactivate
            </Button>
          </div>

          <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-destructive text-sm font-medium">
                Delete Account
              </p>
              <p className="text-muted-foreground text-xs">
                Permanently deletes your account and all associated data. This
                cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deactivate confirmation dialog */}
      <Dialog
        open={deactivateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateInput('');
            setDeactivateError('');
          }
          setDeactivateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Business?</DialogTitle>
            <DialogDescription>
              Your business will be hidden from the app. Type{' '}
              <strong>DEACTIVATE</strong> below to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Label htmlFor="deactivate-confirm">Confirmation</Label>
            <Input
              id="deactivate-confirm"
              placeholder="DEACTIVATE"
              value={deactivateInput}
              onChange={(e) => setDeactivateInput(e.target.value)}
            />
            {deactivateError && (
              <Alert variant="destructive">
                <AlertDescription>{deactivateError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deactivating}
              onClick={handleDeactivate}
            >
              {deactivating ? 'Deactivating...' : 'Confirm Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete account confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteInput('');
            setDeletePassword('');
            setDeleteError('');
          }
          setDeleteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete Account Permanently?
            </DialogTitle>
            <DialogDescription>
              This will erase your account and all data. This action{' '}
              <strong>cannot</strong> be undone. Enter your password and type{' '}
              <strong>DELETE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="delete-password">Password</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="••••••••"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="delete-confirm">Type DELETE</Label>
              <Input
                id="delete-confirm"
                placeholder="DELETE"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
              />
            </div>
            {deleteError && (
              <Alert variant="destructive">
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
