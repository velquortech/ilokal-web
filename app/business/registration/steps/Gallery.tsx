'use client';

import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';

import { Controller } from 'react-hook-form';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { Field, FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export function ShopGallery() {
  return (
    <div className="flex flex-1 flex-col space-y-8">
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
          <li>Use a square or circular logo for best results</li>
          <li>Minimum dimensions: 500x500 pixels</li>
          <li>High contrast colors work best</li>
          <li>Avoid text-heavy logos if possible</li>
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
            <h2 className="mb-4 font-semibold">Shop Logo</h2>

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
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                form.setValue('shop_logo', file, {
                  shouldValidate: true,
                });

                // Cache the file
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
            <h2 className="mb-4 font-semibold">Shop Banner</h2>

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
                        alt="Banner preview"
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
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                form.setValue('shop_banner', file, {
                  shouldValidate: true,
                });

                // Cache the file
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
        <div className="bg-card border-border aspect-video h-64 overflow-hidden rounded-lg border-2">
          <Image
            src={preview}
            alt={`Interior ${index + 1}`}
            className="h-full w-full object-contain"
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

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentFiles = form.getValues('interior_images') || [];
    const newFiles = [...currentFiles, ...files];
    form.setValue('interior_images', newFiles, { shouldValidate: true });

    // Cache all interior images
    cacheFiles('interior_images', newFiles);

    // Reset input value to allow selecting same files again
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
            <h2 className="mb-4 font-semibold">Interior Images</h2>

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

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}
