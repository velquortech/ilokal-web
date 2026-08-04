'use client';

/**
 * The one event form.
 *
 * Two surfaces write events — a shop proposing one, and an admin publishing a
 * staff pick — and the fields are the same fields. The differences are copy,
 * whether a draft is possible, and whether the event can promote an offering;
 * none of those is a reason for a second form to drift away from this one
 * (CLAUDE.md §DRY).
 *
 * The copy lives in a `Record<Variant, …>` map rather than in `if` branches,
 * so a new variant is a compile error until every string is written.
 *
 * The save and upload calls are INJECTED. A Server Action is bound to a role —
 * the owner's writes go through `verifyBusinessOwner`, the admin's through the
 * admin guard — so the component that renders the fields must not choose one.
 */

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
import { LocationField } from '@/components/custom/map/LocationField';
import {
  isoToManilaInput,
  manilaInputToIso,
  timeToInput,
} from '@/lib/utils/eventSchedule';
import type { ApiResponse, Event, EventWithRefs } from '@/lib/types';

export interface OfferingOption {
  id: string;
  name: string;
}

/** Who is writing. Drives copy, the draft button, and the offering picker. */
export type EventFormVariant = 'proposal' | 'staff-pick';

interface VariantCopy {
  createTitle: string;
  createDescription: string;
  editTitle: string;
  editDescription: string;
  /** The primary button when creating. */
  createSubmit: string;
  /** The primary button when editing. */
  editSubmit: string;
  createdMessage: string;
  updatedMessage: string;
  /** Omitted = this variant has no draft state, so no second button. */
  draftSubmit?: string;
  draftMessage?: string;
}

const VARIANT_COPY: Record<EventFormVariant, VariantCopy> = {
  proposal: {
    createTitle: 'Propose an event',
    createDescription:
      'The iLokal team reviews every event before it appears on Explore.',
    editTitle: 'Edit event',
    editDescription: 'Saving sends this back to the iLokal team for review.',
    createSubmit: 'Send for review',
    editSubmit: 'Save and resubmit',
    createdMessage: 'Sent for review',
    updatedMessage:
      'Event saved. It goes back for review before it is published again.',
    draftSubmit: 'Save draft',
    draftMessage: 'Draft saved',
  },
  'staff-pick': {
    createTitle: 'Add an iLokal event',
    // Said plainly, because it is the difference that matters: nobody reviews
    // this one.
    createDescription:
      'This is a staff pick. It publishes to Explore straight away — there is no review step.',
    editTitle: 'Edit iLokal event',
    editDescription: 'Changes are live as soon as you save.',
    createSubmit: 'Publish event',
    editSubmit: 'Save changes',
    createdMessage: 'Published to Explore',
    updatedMessage: 'Event updated',
  },
};

/** What the dialog hands back, matching `createEventSchema`'s shape. */
export interface EventFormPayload {
  name: string;
  description: string | null;
  address: string;
  image_url: string | null;
  starts_at: string;
  ends_at: string;
  daily_start_time: string | null;
  daily_end_time: string | null;
  link_url: string;
  ticket_url: string;
  product_id: string | null;
  latitude?: number;
  longitude?: number;
}

interface EventFormDialogProps {
  variant: EventFormVariant;
  children: React.ReactNode;
  /** Present when editing. */
  event?: EventWithRefs;
  /**
   * The shop's offerings, for the "this event promotes…" picker. Omitted for a
   * staff pick — a platform event has no shop, so it has nothing to promote.
   */
  offerings?: OfferingOption[];
  /** `asDraft` is only ever true for a variant that declares a draft button. */
  onSave: (
    payload: EventFormPayload,
    options: { asDraft: boolean },
  ) => Promise<ApiResponse<Event>>;
  onUploadImage: (formData: FormData) => Promise<ApiResponse<{ url: string }>>;
}

const NO_OFFERING = 'none';

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
    // Prefilled from the DB's generated projections of `location`. Leaving
    // these blank on an edit is what made every save look like "the owner
    // cleared the pin".
    latitude: event?.latitude != null ? String(event.latitude) : '',
    longitude: event?.longitude != null ? String(event.longitude) : '',
    startsAt: isoToManilaInput(event?.starts_at),
    endsAt: isoToManilaInput(event?.ends_at),
    dailyStart: timeToInput(event?.daily_start_time),
    dailyEnd: timeToInput(event?.daily_end_time),
    linkUrl: event?.link_url ?? '',
    ticketUrl: event?.ticket_url ?? '',
    productId: event?.product_id ?? NO_OFFERING,
  };
}

export function EventFormDialog({
  variant,
  children,
  event,
  offerings,
  onSave,
  onUploadImage,
}: EventFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(event);
  const copy = VARIANT_COPY[variant];

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

  /** The coordinate keys, present only when the pair is genuinely usable. */
  const coordinates = (state: FormState) => {
    const lat = Number(state.latitude);
    const lng = Number(state.longitude);
    if (
      state.latitude.trim() === '' ||
      state.longitude.trim() === '' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return {};
    }
    return { latitude: lat, longitude: lng };
  };

  const submit = async (asDraft: boolean) => {
    setPending(true);
    setError(null);

    const toastId = 'event-save';
    toast.loading(asDraft ? 'Saving draft…' : 'Saving…', { id: toastId });

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const data = new FormData();
        data.set('file', imageFile);
        const upload = await onUploadImage(data);
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

      const payload: EventFormPayload = {
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
        // Sent ONLY when both parse to real numbers. A blank field means "I
        // did not set a pin", never "erase the one that is there" — the
        // service refuses to write `location` without a pair for the same
        // reason, so an empty form cannot wipe a point at either layer.
        ...coordinates(form),
      };

      const result = await onSave(payload, { asDraft });

      if (result.success) {
        toast.success(
          isEdit
            ? copy.updatedMessage
            : asDraft
              ? (copy.draftMessage ?? copy.createdMessage)
              : copy.createdMessage,
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
            {isEdit ? copy.editTitle : copy.createTitle}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? copy.editDescription : copy.createDescription}
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

          {/* The pin, not two bare numbers: nobody knows their own
              coordinates, and `events_nearby` filters `location IS NOT NULL`,
              so an event filed without one is invisible to "events near me".
              `scrollWheelZoom={false}` because this sits in a scrolling dialog
              body — leaflet's wheel zoom would otherwise swallow the scroll. */}
          <LocationField
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={({ latitude, longitude }) =>
              setForm((prev) => ({ ...prev, latitude, longitude }))
            }
            scrollWheelZoom={false}
            height={240}
          />

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

          {offerings && offerings.length > 0 && (
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
          {!isEdit && copy.draftSubmit && (
            <Button
              variant="secondary"
              onClick={() => submit(true)}
              disabled={pending}
            >
              {copy.draftSubmit}
            </Button>
          )}
          <Button onClick={() => submit(false)} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {isEdit ? copy.editSubmit : copy.createSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
