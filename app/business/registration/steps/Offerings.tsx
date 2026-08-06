'use client';

import { useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field';
import { Plus, Trash2, ListPlus } from 'lucide-react';
import { MAX_REGISTRATION_OFFERINGS } from '../validator/business-registration-form-schema';
import { formatOfferingPrice } from '@/lib/utils/formatOfferingPrice';

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
 *  - No image. Each would be its own ≤2 MB upload and its own IndexedDB entry,
 *    and images are optional on the dashboard too.
 *  - No section, no service attributes, no booking mode. Those are refinements
 *    of a catalogue that exists; this step's whole job is that it exists.
 *
 * What is left is a name and a price, entered inline, which is the least a
 * "menu" can honestly mean.
 */
export function ShopOfferings() {
  const { form, vocabulary } = useMultiStepForm();
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
  const [draftError, setDraftError] = useState<string | null>(null);

  const atCap = fields.length >= MAX_REGISTRATION_OFFERINGS;
  const singular = vocabulary.singular.toLowerCase();

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

    append({ name, price, on_request: draftOnRequest });
    setDraftName('');
    setDraftPrice('');
    // `on_request` is deliberately NOT reset: a shop that quotes one service
    // usually quotes the next one too, and re-ticking it per item is the tax
    // this whole step is trying not to charge.
    setDraftError(null);
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

  return (
    <div className="flex flex-1 flex-col gap-7">
      <Alert>
        <ListPlus />
        <AlertTitle>Your {vocabulary.catalogue.toLowerCase()}</AlertTitle>
        <AlertDescription>
          Add at least one {singular}. Your shop page shows nothing until it has
          one, and this is the fastest place to do it — you can add photos,
          categories and the rest from your dashboard later.
        </AlertDescription>
      </Alert>

      {/* Add row. Kept above the list so it does not walk down the screen as
          items accumulate — on a phone that turns into a scroll per item. */}
      <div className="space-y-4 rounded-lg border p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
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

      <div className="space-y-3">
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
          <div className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Nothing added yet. One is enough to continue.
          </div>
        ) : (
          <ul className="divide-border divide-y rounded-lg border">
            {fields.map((field, index) => {
              const item = form.getValues(`offerings.${index}`);
              return (
                <li
                  key={field.id}
                  className="flex items-center justify-between gap-4 p-3"
                >
                  <div className="min-w-0">
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
                    onClick={() => remove(index)}
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
