'use client';

import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';

import { Controller } from 'react-hook-form';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { Field, FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { MAX_FILE_SIZE } from '../validator/business-registration-form-schema';
import {
  compressImage,
  describeCompression,
  COMPRESSION_PRESETS,
} from '@/lib/utils/compressImage';

export function ShopGallery() {
  // space-y-6: the wizard's 24px rhythm — upload sections and the guideline
  // boxes sit as far apart as field groups on the other steps.
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <ShopLogo />
      <div className="bg-muted/50 border-border space-y-2 rounded-lg border p-4">
        <p className="text-foreground text-sm font-medium">Logo Guidelines:</p>
        <ul className="text-foreground list-inside list-disc space-y-1 text-sm">
          <li>Use a square or circular logo for best results</li>
          <li>Minimum dimensions: 500x500 pixels</li>
          <li>High contrast colors work best</li>
          <li>Avoid text-heavy logos if possible</li>
        </ul>
      </div>

      <ShopBanner />
      <div className="bg-muted/50 border-border space-y-2 rounded-lg border p-4">
        <p className="text-foreground text-sm font-medium">
          Banner Guidelines:
        </p>
        <ul className="text-foreground list-inside list-disc space-y-1 text-sm">
          <li>Use a wide landscape photo — banners are shown full-width</li>
          <li>Minimum dimensions: 1200x400 pixels (or wider)</li>
          <li>Keep important content away from the top and bottom edges</li>
          <li>Avoid small text — it gets cropped on narrow screens</li>
        </ul>
      </div>

      <InteriorImages />
      <div className="bg-muted/50 border-border space-y-2 rounded-lg border p-4">
        <p className="text-foreground text-sm font-medium">Photo Tips:</p>
        <ul className="text-foreground list-inside list-disc space-y-1 text-sm">
          <li>Use good lighting - natural light works best</li>
          <li>Show different angles and sections of your shop</li>
          <li>Keep the area clean and organized</li>
          <li>Highlight your best displays and products</li>
        </ul>
      </div>
    </div>
  );
}

function ShopLogo() {
  const { form, cacheFile, clearFileCache } = useMultiStepForm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shopLogoFile = form.watch('shop_logo');
  const [preview, setPreview] = useState<string>();

  // Sync preview from form file changes (including on restore)
  useEffect(() => {
    if (shopLogoFile) {
      const url = URL.createObjectURL(shopLogoFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(undefined);
    }
  }, [shopLogoFile]);

  return (
    <Controller
      name="shop_logo"
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="h-max flex-col">
            {/* mb-6: 24px from the heading to the upload box, matching the
                other steps' heading-to-field spacing. */}
            <h2 className="mb-6 font-semibold">Shop Logo</h2>

            <div
              className="border-border hover:border-primary hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-12"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="bg-card h-48 w-48 overflow-hidden rounded-lg border-2">
                      <Image
                        src={preview}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                        height={0}
                        width={0}
                      />
                    </div>

                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 rounded-full"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        form.setValue('shop_logo', undefined, {
                          shouldValidate: true,
                        });

                        // Clear cached file
                        clearFileCache('shop_logo');

                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-primary/10 text-primary rounded-full p-4">
                    <ImageIcon className="h-8 w-8" />
                  </div>

                  <div>
                    <p className="mb-1 font-medium">Upload your logo</p>
                    <p className="text-muted-foreground text-sm">
                      PNG, JPG or SVG (max. 2MB)
                    </p>
                  </div>

                  <Button type="button" variant="secondary">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const picked = e.target.files?.[0];
                if (!picked) return;

                // Compressed first: a phone photo is 3–6 MB, and the 2 MB cap
                // is a transport limit rather than a rule about the picture.
                const result = await compressImage(picked, {
                  maxBytes: MAX_FILE_SIZE,
                  maxDimension: COMPRESSION_PRESETS.logo,
                });
                const file = result.file;

                if (file.size > MAX_FILE_SIZE) {
                  form.setError('shop_logo', {
                    type: 'manual',
                    message:
                      describeCompression(result, '2 MB') ??
                      'Image must be 2MB or less',
                  });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  return;
                }

                form.setValue('shop_logo', file, { shouldValidate: true });
                cacheFile('shop_logo', file);

                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            />

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}

function ShopBanner() {
  const { form, cacheFile, clearFileCache } = useMultiStepForm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const shopBannerFile = form.watch('shop_banner');
  const [preview, setPreview] = useState<string>();

  // Sync preview from form file changes (including on restore)
  useEffect(() => {
    if (shopBannerFile) {
      const url = URL.createObjectURL(shopBannerFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(undefined);
    }
  }, [shopBannerFile]);

  return (
    <Controller
      name="shop_banner"
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="h-max flex-col">
            <h2 className="mb-6 font-semibold">Shop Banner</h2>

            <div
              className="border-border hover:border-primary hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-12"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="flex flex-col items-center gap-4">
                  {/* The banner is a WIDE cover image, not a square: preview it
                      at the hero's own aspect ratio with object-cover so what
                      the owner sees is the crop shoppers get (the shop page
                      renders banner_url full-width h-40/h-80 object-cover). A
                      square object-contain box — the old preview — shrank the
                      image to a strip and hid exactly the cropping that
                      matters. */}
                  <div className="relative w-full">
                    <div className="bg-card relative aspect-[3/1] w-full overflow-hidden rounded-lg border-2">
                      <Image
                        src={preview}
                        alt="Banner preview"
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, 60vw"
                        className="object-cover"
                      />
                    </div>
                    <p className="text-muted-foreground mt-1.5 text-center text-xs">
                      Banners are cropped to fill the top of your shop page.
                    </p>

                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 rounded-full"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        form.setValue('shop_banner', undefined, {
                          shouldValidate: true,
                        });

                        // Clear cached file
                        clearFileCache('shop_banner');

                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-primary/10 text-primary rounded-full p-4">
                    <ImageIcon className="h-8 w-8" />
                  </div>

                  <div>
                    <p className="mb-1 font-medium">Upload your banner</p>
                    <p className="text-muted-foreground text-sm">
                      PNG, JPG or SVG (max. 2MB) — wide landscape works best
                    </p>
                  </div>

                  <Button type="button" variant="secondary">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const picked = e.target.files?.[0];
                if (!picked) return;

                // Compressed first: a phone photo is 3–6 MB, and the 2 MB cap
                // is a transport limit rather than a rule about the picture.
                const result = await compressImage(picked, {
                  maxBytes: MAX_FILE_SIZE,
                  maxDimension: COMPRESSION_PRESETS.hero,
                });
                const file = result.file;

                if (file.size > MAX_FILE_SIZE) {
                  form.setError('shop_banner', {
                    type: 'manual',
                    message:
                      describeCompression(result, '2 MB') ??
                      'Image must be 2MB or less',
                  });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  return;
                }

                form.setValue('shop_banner', file, { shouldValidate: true });
                cacheFile('shop_banner', file);

                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            />

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}

function InteriorImageItem({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!preview) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* object-cover, not contain: the shop gallery crops every interior to
            a cover (masonry / aspect-video grid), so a letterboxed preview
            hides the crop the owner is approving. The box is width-driven
            (`w-full`, not a fixed `h-64`): a fixed 256px height + 16:9 ratio
            resolves to a 455px-wide card that overflows a phone's column
            (and any grid cell narrower than 455px), stretching the page
            sideways. Full-width keeps the 16:9 crop truthful at every
            breakpoint — one column on mobile, half the row at `sm+`. */}
        <div className="bg-card border-border aspect-video w-full overflow-hidden rounded-lg border-2">
          <Image
            src={preview}
            alt={`Interior ${index + 1}`}
            className="h-full w-full object-cover"
            width={0}
            height={0}
          />
        </div>

        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 rounded-full"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function InteriorImages() {
  const { form, cacheFiles, clearFileCache } = useMultiStepForm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const interiorImages = form.watch('interior_images') || [];
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files || []);
    if (!allFiles.length) return;

    setSizeError(null);
    setBusy(true);

    // Compressed BEFORE the size filter. This step asks for at least FOUR
    // photos of the shop, and a phone takes 3–6 MB pictures — so the filter
    // used to drop most of what an owner selected and report a count, which is
    // the least useful thing it could say at the moment it happens.
    const processed = await Promise.all(
      allFiles.map((file) =>
        compressImage(file, {
          maxBytes: MAX_FILE_SIZE,
          maxDimension: COMPRESSION_PRESETS.interior,
        }),
      ),
    );
    setBusy(false);

    const validFiles = processed
      .filter((result) => result.file.size <= MAX_FILE_SIZE)
      .map((result) => result.file);
    const rejected = processed.filter(
      (result) => result.file.size > MAX_FILE_SIZE,
    );

    if (rejected.length > 0) {
      // Names the actual reason for the first failure rather than restating
      // the rule: HEIC and animation are unfixable by trying again, and the
      // owner cannot tell which they hit from a size message.
      const reason = describeCompression(rejected[0], '2 MB');
      setSizeError(
        rejected.length === 1
          ? (reason ?? 'That image could not be added.')
          : `${rejected.length} images could not be added. ${reason ?? ''}`.trim(),
      );
    }

    if (validFiles.length > 0) {
      const currentFiles = form.getValues('interior_images') || [];
      const newFiles = [...currentFiles, ...validFiles];
      form.setValue('interior_images', newFiles, { shouldValidate: true });
      cacheFiles('interior_images', newFiles);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const currentFiles = form.getValues('interior_images') || [];
    const newFiles = currentFiles.filter(
      (_: File, i: number) => i !== indexToRemove,
    );
    form.setValue('interior_images', newFiles, { shouldValidate: true });

    // Clear file cache and recache remaining files
    clearFileCache('interior_images');
    if (newFiles.length > 0) {
      cacheFiles('interior_images', newFiles);
    }
  };

  return (
    <Controller
      name="interior_images"
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex flex-1 flex-col">
            <h2 className="mb-6 font-semibold">Interior Images</h2>

            <div
              className={cn(
                'border-border hover:border-primary hover:bg-muted/50 min-h-64 cursor-pointer grid-cols-1 gap-4 rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:min-h-96 sm:grid-cols-2 sm:gap-8 sm:p-12',
                interiorImages.length > 0 && 'grid',
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {interiorImages.length > 0 ? (
                interiorImages.map((file: File, index: number) => (
                  <InteriorImageItem
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    file={file}
                    index={index}
                    onRemove={handleRemoveImage}
                  />
                ))
              ) : (
                <div className="m-auto flex flex-col items-center gap-4 p-4">
                  <div className="bg-primary/10 text-primary rounded-full p-4">
                    <ImageIcon className="h-8 w-8" />
                  </div>

                  <div>
                    <p className="mb-1 font-medium">Add Interior Images</p>
                    <p className="text-muted-foreground text-sm">
                      PNG, JPG or SVG (max. 2MB)
                    </p>
                  </div>

                  <Button type="button" variant="secondary">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddImages}
            />

            {busy && (
              <p
                className="text-muted-foreground text-xs"
                role="status"
                aria-live="polite"
              >
                Resizing your photos…
              </p>
            )}
            {sizeError && <FieldError errors={[{ message: sizeError }]} />}
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}
