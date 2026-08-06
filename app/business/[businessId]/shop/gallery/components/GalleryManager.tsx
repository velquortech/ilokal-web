'use client';

import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GalleryUploader } from '@/components/custom/GalleryUploader';
import { updateBusinessGalleryAction } from '../../../actions/galleryActions';
import { MASONRY_MIN_IMAGES, MAX_GALLERY_IMAGES } from '@/config/gallery';

const SAVE_TOAST_ID = 'shop-gallery-save';

export function GalleryManager({
  businessId,
  initialImages,
  loadFailed = false,
}: {
  businessId: string;
  initialImages: string[];
  /**
   * The read failed, as opposed to the gallery being empty. Six missing tiles
   * and an outage look identical otherwise, and the empty state would tell an
   * owner to upload photos they may already have.
   */
  loadFailed?: boolean;
}) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const inFlight = useRef(false);
  /**
   * The latest gallery that still needs saving, held while an earlier save is
   * in flight.
   *
   * 🔴 This used to be `if (inFlight.current) return` — a silent DROP. A batch
   * of uploads finishing while a confirmed removal was still saving discarded
   * the newer state with no toast, no retry and no visible change, leaving the
   * just-uploaded file orphaned in the bucket and the owner believing it saved.
   * A queue of exactly one is enough: each entry is the whole desired array,
   * not a delta, so a newer one wholly supersedes an older one.
   */
  const queued = useRef<string[] | null>(null);
  /** The last state the SERVER is known to hold, for a rollback. */
  const committed = useRef<string[]>(initialImages);

  /**
   * Saved on the spot rather than behind a "Save changes" button, because the
   * upload has ALREADY happened by the time this runs: the file is in the
   * bucket. Leaving the row unwritten until a separate click means every
   * abandoned page both loses the owner's work and orphans the file it
   * uploaded. What is on screen is what is stored.
   */
  const persist = useCallback(
    async (next: string[]) => {
      setImages(next);

      if (inFlight.current) {
        queued.current = next;
        return;
      }

      inFlight.current = true;
      setSaving(true);

      let target: string[] | null = next;
      try {
        while (target) {
          const attempt = target;
          queued.current = null;

          let ok = false;
          try {
            const result = await updateBusinessGalleryAction(
              businessId,
              attempt,
            );
            ok = result.success;
            if (!ok) {
              toast.error(
                result.error?.message ?? 'Could not save your gallery.',
                { id: SAVE_TOAST_ID },
              );
            }
          } catch {
            // A rejected action would otherwise leave the page showing a change
            // the database never took.
            toast.error('Could not save your gallery. Please try again.', {
              id: SAVE_TOAST_ID,
            });
          }

          if (ok) {
            committed.current = attempt;
          } else {
            // 🔴 Roll back to the last state the server confirmed, but KEEP any
            // photo that was uploaded while this save was failing. Discarding
            // the queue here would make a file that is already in the bucket
            // vanish from the screen and be orphaned — the round-1 silent drop,
            // made visible rather than removed. The failed change is undone;
            // the unrelated additions survive.
            const rescued = (queued.current ?? []).filter(
              (url) =>
                !committed.current.includes(url) && !attempt.includes(url),
            );
            queued.current = null;
            setImages([...committed.current, ...rescued]);
            break;
          }

          target = queued.current;
          if (!target) toast.success('Gallery updated.', { id: SAVE_TOAST_ID });
        }
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
    },
    [businessId],
  );

  const handleConfirmedRemove = () => {
    if (!confirmRemove) return;
    const next = images.filter((url) => url !== confirmRemove);
    setConfirmRemove(null);
    void persist(next);
  };

  if (loadFailed) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="text-muted-foreground size-8" />
          <div className="space-y-1">
            <p className="font-medium">We couldn&apos;t load your gallery</p>
            <p className="text-muted-foreground text-sm">
              Your photos are still there. Refresh the page to try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const remaining = MASONRY_MIN_IMAGES - images.length;

  return (
    <>
      <Card>
        <CardContent className="space-y-4">
          <GalleryUploader
            businessId={businessId}
            value={images}
            onChange={persist}
            onRequestRemove={setConfirmRemove}
            showCounter={false}
          />

          <div className="text-muted-foreground space-y-1 text-xs">
            <p className="flex items-center gap-2">
              {saving && <Loader2 className="size-3 animate-spin" />}
              {images.length}/{MAX_GALLERY_IMAGES} photos
              {saving ? ' · saving…' : ' · changes save automatically'}
            </p>
            {/* Both numbers, because they are different numbers. An owner with
                three photos otherwise cannot tell why their shop page shows a
                plain row instead of the full layout. */}
            <p>
              {remaining > 0
                ? `Add ${remaining} more ${remaining === 1 ? 'photo' : 'photos'} to show the full gallery layout on your shop page.`
                : 'Your shop page is showing the full gallery layout.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* shadcn's alert-dialog primitive is not installed and the stack is
          frozen, so this is the repo's own Dialog — same pattern as
          manage-sections.tsx and delete-product.tsx. */}
      <Dialog
        open={confirmRemove !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this photo?</DialogTitle>
            <DialogDescription>
              It comes off your shop page straight away and the file is deleted.
              You would need to upload it again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep it</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmedRemove}>
              Remove photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
