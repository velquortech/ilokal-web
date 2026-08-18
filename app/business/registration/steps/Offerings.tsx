'use client';

import { useEffect, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field';
import { Plus, Trash2, ListPlus, ImageIcon } from 'lucide-react';
import {
  MAX_FILE_SIZE,
  MAX_REGISTRATION_OFFERINGS,
} from '../validator/business-registration-form-schema';
import { formatOfferingPrice } from '@/lib/utils/formatOfferingPrice';
import { ImageUploadField } from '@/components/custom/upload/image-upload';

/**
 * A row's picked photo, previewed from the File itself.
 *
 * `URL.createObjectURL` rather than a data URL: the blob stays where it is and
 * nothing base64-inflates it into memory, which is what blew the localStorage
 * quota when registration cached files as strings. The URL is revoked when the
 * row unmounts, or the object leaks for the life of the document.
 *
 * A plain <img>, not next/image: the source is a blob: URL with no known
 * dimensions and nothing to optimise — the optimiser would only be asked to
 * fetch a URL it cannot see.
 */
function OfferingThumbnail({ file, alt }: { file?: File; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) {
    return (
      <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded">
        <ImageIcon className="size-4" aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="size-10 shrink-0 rounded object-cover"
    />
  );
}

/**
 * The menu step — the one thing registration never asked for.
 *
 * Before this, the wizard's definition of "done" excluded the catalogue: a
 * shop submitted, was auto-verified, and went public with zero offerings. An
 * owner who never added a menu was following the product exactly as designed,
 * and every countermeasure (the setup checklist, the follow-up email) was
 * chasing someone who had already left.
 *
 * Deliberately NOT the dashboard's add-product dialog:
 *
 *  - No category select. It is optional there now, and here there is no reason
 *    to show a 9-to-20 option taxonomy before the shop exists.
 *  - No section and no service attributes. Those are refinements of a catalogue
 *    that exists; this step's whole job is that it exists. (Booking mode used to
 *    be listed here too — the booking feature was removed on 2026-08-17 and is
 *    not planned, so there is nothing to defer.)
 *
 * What is left is a name, a price and an optional photo, entered inline. The
 * photo cannot be uploaded here — the `product-images` bucket keys its INSERT
 * policy on the business id, and that row does not exist until final submit —
 * so it is held by `useOfferingImages` and uploaded afterwards.
 */
export function ShopOfferings() {
  const { form, vocabulary, offeringImages } = useMultiStepForm();
  const {
    control,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'offerings',
  });

  const [draftName, setDraftName] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftOnRequest, setDraftOnRequest] = useState(false);
  const [draftImage, setDraftImage] = useState<File | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  // `ImageUploadField` keeps its own preview state, so clearing the draft
  // after an add means remounting it rather than nulling a value it does not
  // read back.
  const [imageFieldKey, setImageFieldKey] = useState(0);

  const atCap = fields.length >= MAX_REGISTRATION_OFFERINGS;
  const singular = vocabulary.singular.toLowerCase();

  // A reload restores the rows from localStorage but not the photo blobs —
  // those live in IndexedDB, keyed per row. Pull them back for the rows that
  // still exist.
  useEffect(() => {
    const uids = form
      .getValues('offerings')
      ?.map((item) => item?.uid)
      .filter((uid): uid is string => Boolean(uid));
    if (uids?.length) void offeringImages.hydrate(uids);
    // Deliberately mount-only: this restores what the cache already holds for
    // the rows the form was rehydrated with. Re-running it on every change
    // would re-read IndexedDB on every keystroke and could resurrect a photo
    // the owner just removed.
  }, [form, offeringImages]);

  const addDraft = () => {
    const name = draftName.trim();
    if (!name) {
      setDraftError('Enter a name');
      return;
    }
    if (atCap) {
      setDraftError(
        `You can add up to ${MAX_REGISTRATION_OFFERINGS} here — the rest go in your dashboard`,
      );
      return;
    }

    let price: number | null = null;
    if (!draftOnRequest) {
      const parsed = Number(draftPrice);
      if (draftPrice.trim() === '' || Number.isNaN(parsed)) {
        setDraftError('Enter a price, or mark it as priced on request');
        return;
      }
      if (parsed < 0) {
        setDraftError('Price cannot be negative');
        return;
      }
      price = parsed;
    }

    // Minted here so the photo can be keyed to this row for the rest of the
    // wizard — see useOfferingImages for why an array index will not do.
    const uid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (draftImage) offeringImages.set(uid, draftImage);

    append({ uid, name, price, on_request: draftOnRequest });
    setDraftName('');
    setDraftPrice('');
    setDraftImage(null);
    setImageFieldKey((key) => key + 1);
    // `on_request` is deliberately NOT reset: a shop that quotes one service
    // usually quotes the next one too, and re-ticking it per item is the tax
    // this whole step is trying not to charge.
    setDraftError(null);
  };

  /** Drops the row and the photo together, so no orphan blob is left behind. */
  const removeItem = (index: number) => {
    const uid = form.getValues(`offerings.${index}.uid`);
    if (uid) offeringImages.remove(uid);
    remove(index);
  };

  /**
   * Enter adds the item instead of submitting the wizard.
   *
   * Without this, a single text input in a form means Enter triggers the
   * form's submit — so typing a name and pressing Enter would advance the
   * step rather than add the item the owner just typed.
   */
  const handleDraftKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addDraft();
  };

  // `errors.offerings` is the ARRAY-level error (min 1 / max N). Per-item
  // errors live at `errors.offerings[i]` and cannot occur here — every item
  // is validated by `addDraft` before it is appended.
  const listError =
    typeof errors.offerings?.message === 'string'
      ? errors.offerings.message
      : null;

  // gap-6: the wizard's 24px rhythm — the alert and the add-row sit as far
  // apart as field groups on the other steps.
  return (
    <div className="flex flex-1 flex-col gap-6">
      <Alert>
        <ListPlus />
        <AlertTitle>Your {vocabulary.catalogue.toLowerCase()}</AlertTitle>
        <AlertDescription>
          Add at least one {singular}. Your shop page shows nothing until it has
          one, and this is the fastest place to do it — you can add more, and
          change anything, from your dashboard later.
        </AlertDescription>
      </Alert>

      {/* Add row. Kept above the list so it does not walk down the screen as
          items accumulate — on a phone that turns into a scroll per item. */}
      {/* space-y-6 / gap-6: the wizard's 24px field rhythm — name, price,
          on-request, photo and the add button are all fields, so they sit as
          far apart as fields do anywhere else in the wizard. */}
      <div className="space-y-6 rounded-lg border p-5">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="offering-name">{vocabulary.singular} name</Label>
            <Input
              id="offering-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder="e.g. Flat White"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offering-price">Price</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                ₱
              </span>
              <Input
                id="offering-price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                className="pl-8"
                value={draftOnRequest ? '' : draftPrice}
                onChange={(event) => setDraftPrice(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                placeholder="0.00"
                disabled={draftOnRequest}
              />
            </div>
          </div>
        </div>

        {/* The escape hatch for work that genuinely has no fixed price — a
            quoted site visit, a bespoke package. Without it, "price required"
            would make this step unfinishable for those shops. */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="offering-on-request"
            checked={draftOnRequest}
            onCheckedChange={(checked) => {
              setDraftOnRequest(checked === true);
              setDraftError(null);
            }}
          />
          <Label
            htmlFor="offering-on-request"
            className="text-muted-foreground text-sm font-normal"
          >
            Price on request (you quote each customer)
          </Label>
        </div>

        {/* Optional, and last, so it never stands between the owner and the
            two fields that actually matter. The shared field is mandatory
            here: it is what runs `compressImage`, and a phone photo is 3–6 MB
            against a 2 MB cap, so a bespoke picker would reject exactly the
            pictures this step wants. It also owns the EXIF-rotation, animated
            and alpha handling that the contract sweep exists to keep in one
            place. */}
        <div className="space-y-2">
          <Label>Photo (optional)</Label>
          <div className="relative min-h-32">
            <ImageUploadField
              key={imageFieldKey}
              onChange={(image) =>
                setDraftImage(image instanceof File ? image : null)
              }
              onError={setDraftError}
              maxSizeBytes={MAX_FILE_SIZE}
              maxSizeLabel="2 MB"
            />
          </div>
          {!offeringImages.cached && (
            <p className="text-muted-foreground text-xs">
              These photos are too large to hold in browser storage — they are
              still attached, but reloading this page would lose them.
            </p>
          )}
        </div>

        {draftError && <FieldError>{draftError}</FieldError>}

        <Button
          type="button"
          variant="secondary"
          onClick={addDraft}
          disabled={atCap}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add {singular}
        </Button>
      </div>

      {/* The list absorbs the leftover height.

          The wizard stretches each step to fill the column above the Back/Next
          bar (`<div className="flex flex-1">{stepComponent}</div>`), so a short
          step has slack to put somewhere. Left unclaimed it pools at the bottom
          as a dead band — ~285px of blank page between the last thing you can
          read and the buttons. Giving it to the list turns that space into the
          box the items will land in, which is the one region on this step that
          is *supposed* to grow. */}
      <div className="flex min-h-0 flex-1 flex-col space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {vocabulary.catalogue} ({fields.length})
          </p>
          {atCap && (
            <p className="text-muted-foreground text-xs">
              Add the rest from your dashboard
            </p>
          )}
        </div>

        {fields.length === 0 ? (
          <div className="border-border text-muted-foreground flex flex-1 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm">
            Nothing added yet. One is enough to continue.
          </div>
        ) : (
          // Same `flex-1` as the empty state, so the list box occupies the
          // same region whether or not it has anything in it — the layout
          // does not jump the moment the first item lands. Past a screenful
          // it simply grows and the page scrolls, which is what the shell's
          // single scroll container is for.
          <ul className="divide-border flex-1 divide-y rounded-lg border">
            {fields.map((field, index) => {
              const item = form.getValues(`offerings.${index}`);
              return (
                <li
                  key={field.id}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  {/* Fixed 40px, so a row with a photo is the same height as
                      one without and the list does not go ragged. Sized in the
                      markup rather than by the image, because these are
                      object-URL previews with no known dimensions. */}
                  <OfferingThumbnail
                    file={item?.uid ? offeringImages.get(item.uid) : undefined}
                    alt={item?.name ?? ''}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item?.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {/* The same formatter the storefront uses, so what the
                          owner reads here is what a customer will read. */}
                      {formatOfferingPrice({
                        price: item?.on_request ? null : (item?.price ?? null),
                        price_type: item?.on_request ? 'on_request' : 'fixed',
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    aria-label={`Remove ${item?.name ?? singular}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {listError && <FieldError>{listError}</FieldError>}
      </div>
    </div>
  );
}
