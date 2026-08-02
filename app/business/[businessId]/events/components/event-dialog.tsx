'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUploadField } from '@/components/custom/upload/image-upload';
import {
  isoToManilaInput,
  manilaInputToIso,
  timeToInput,
} from '@/lib/utils/eventSchedule';
import type { EventWithRefs } from '@/lib/types';
import {
  createEventAction,
  updateEventAction,
  uploadEventImageAction,
} from '../../actions/eventActions';

export interface OfferingOption {
  id: string;
  name: string;
}

const NO_OFFERING = 'none';

interface EventDialogProps {
  offerings: OfferingOption[];
  /** Present when editing. */
  event?: EventWithRefs;
  children: React.ReactNode;
}

type FormState = {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  startsAt: string;
  endsAt: string;
  dailyStart: string;
  dailyEnd: string;
  linkUrl: string;
  ticketUrl: string;
  productId: string;
};

function initialState(event?: EventWithRefs): FormState {
  return {
    name: event?.name ?? '',
    description: event?.description ?? '',
    address: event?.address ?? '',
    latitude: '',
    longitude: '',
    startsAt: isoToManilaInput(event?.starts_at),
    endsAt: isoToManilaInput(event?.ends_at),
    dailyStart: timeToInput(event?.daily_start_time),
    dailyEnd: timeToInput(event?.daily_end_time),
    linkUrl: event?.link_url ?? '',
    ticketUrl: event?.ticket_url ?? '',
    productId: event?.product_id ?? NO_OFFERING,
  };
}

// No `businessId` prop: every action derives the shop from the session via
// `verifyBusinessOwner`, so passing one from the client would be a value the
// server must ignore anyway.
export function EventDialog({ offerings, event, children }: EventDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(event);

  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(() => initialState(event));
  const [dailyHours, setDailyHours] = React.useState(
    Boolean(event?.daily_start_time),
  );
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageUrl, setImageUrl] = React.useState(event?.image_url ?? '');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reopening a dialog on a row whose data changed underneath should show the
  // new data, not what was loaded the first time it mounted.
  React.useEffect(() => {
    if (open) {
      setForm(initialState(event));
      setDailyHours(Boolean(event?.daily_start_time));
      setImageUrl(event?.image_url ?? '');
      setImageFile(null);
      setError(null);
    }
  }, [open, event]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (asDraft: boolean) => {
    setPending(true);
    setError(null);

    const toastId = 'event-save';
    toast.loading(asDraft ? 'Saving draft…' : 'Sending for review…', {
      id: toastId,
    });

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const data = new FormData();
        data.set('file', imageFile);
        const upload = await uploadEventImageAction(data);
        if (!upload.success || !upload.data) {
          const message =
            upload.error?.message ?? 'Failed to upload the image.';
          setError(message);
          toast.error(message, { id: toastId });
          return;
        }
        finalImageUrl = upload.data.url;
      }

      const startsAt = manilaInputToIso(form.startsAt);
      const endsAt = manilaInputToIso(form.endsAt);
      if (!startsAt || !endsAt) {
        const message = 'Add a start and end date and time.';
        setError(message);
        toast.error(message, { id: toastId });
        return;
      }

      const payload = {
        name: form.name,
        description: form.description || null,
        address: form.address,
        image_url: finalImageUrl || null,
        starts_at: startsAt,
        ends_at: endsAt,
        daily_start_time: dailyHours ? form.dailyStart || null : null,
        daily_end_time: dailyHours ? form.dailyEnd || null : null,
        link_url: form.linkUrl,
        ticket_url: form.ticketUrl,
        product_id: form.productId === NO_OFFERING ? null : form.productId,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      };

      const result = event
        ? await updateEventAction(event.id, payload)
        : await createEventAction(payload, !asDraft);

      if (result.success) {
        toast.success(
          isEdit
            ? 'Event saved. It goes back for review before it is published again.'
            : asDraft
              ? 'Draft saved'
              : 'Sent for review',
          { id: toastId },
        );
        setOpen(false);
        router.refresh();
      } else {
        const message = result.error?.message ?? 'Something went wrong.';
        setError(message);
        toast.error(message, { id: toastId });
      }
    } catch {
      const message = 'Something went wrong.';
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit event' : 'Propose an event'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Saving sends this back to the iLokal team for review.'
              : 'The iLokal team reviews every event before it appears on Explore.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <Field>
            <FieldLabel htmlFor="event-name">Event name</FieldLabel>
            <Input
              id="event-name"
              value={form.name}
              maxLength={120}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Dinagyang street party"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="event-description">What is it?</FieldLabel>
            <Textarea
              id="event-description"
              value={form.description}
              maxLength={2000}
              rows={3}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Tell people what to expect."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="event-address">Where</FieldLabel>
            <Input
              id="event-address"
              value={form.address}
              maxLength={300}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Iznart St, Iloilo City"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="event-lat">
                Latitude{' '}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="event-lat"
                inputMode="decimal"
                value={form.latitude}
                onChange={(e) => set('latitude', e.target.value)}
                placeholder="10.6973"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-lng">
                Longitude{' '}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="event-lng"
                inputMode="decimal"
                value={form.longitude}
                onChange={(e) => set('longitude', e.target.value)}
                placeholder="122.5649"
              />
            </Field>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Coordinates are what let people find this event near them.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="event-start">Starts</FieldLabel>
              <Input
                id="event-start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-end">Ends</FieldLabel>
              <Input
                id="event-end"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
              />
            </Field>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Times are Philippine time.
          </p>

          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Same hours each day</p>
                <p className="text-muted-foreground text-xs">
                  For a run that closes overnight. Leave off if it runs straight
                  through.
                </p>
              </div>
              <Switch
                checked={dailyHours}
                onCheckedChange={setDailyHours}
                aria-label="Same hours each day"
              />
            </div>

            {dailyHours && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="event-daily-start">Opens</FieldLabel>
                  <Input
                    id="event-daily-start"
                    type="time"
                    value={form.dailyStart}
                    onChange={(e) => set('dailyStart', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-daily-end">Closes</FieldLabel>
                  <Input
                    id="event-daily-end"
                    type="time"
                    value={form.dailyEnd}
                    onChange={(e) => set('dailyEnd', e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="event-link">
                Website{' '}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="event-link"
                type="url"
                value={form.linkUrl}
                onChange={(e) => set('linkUrl', e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-tickets">
                Tickets{' '}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="event-tickets"
                type="url"
                value={form.ticketUrl}
                onChange={(e) => set('ticketUrl', e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>

          {offerings.length > 0 && (
            <Field>
              <FieldLabel>
                Promotes{' '}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Select
                value={form.productId}
                onValueChange={(value) => set('productId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="The shop itself" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_OFFERING}>The shop itself</SelectItem>
                  {offerings.map((offering) => (
                    <SelectItem key={offering.id} value={offering.id}>
                      {offering.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field>
            <FieldLabel>Event image</FieldLabel>
            <ImageUploadField
              defaultValue={imageUrl || null}
              maxSizeBytes={2 * 1024 * 1024}
              maxSizeLabel="2 MB"
              onChange={(value) => {
                if (value instanceof File) setImageFile(value);
                else {
                  setImageFile(null);
                  setImageUrl(typeof value === 'string' ? value : '');
                }
              }}
            />
          </Field>

          {error && <FieldError>{error}</FieldError>}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          {!isEdit && (
            <Button
              variant="secondary"
              onClick={() => submit(true)}
              disabled={pending}
            >
              Save draft
            </Button>
          )}
          <Button onClick={() => submit(false)} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {isEdit ? 'Save and resubmit' : 'Send for review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
