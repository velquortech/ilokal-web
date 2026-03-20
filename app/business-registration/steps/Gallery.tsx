'use client';

import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';

import { Controller } from 'react-hook-form';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { Field, FieldError } from '@/components/ui/field';

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
  const { form } = useMultiStepForm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();

  return (
    <Controller
      name="shop_logo"
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="h-max flex-col">
            <h2 className="mb-4 font-semibold">Shop Logo</h2>

            <div
              className="border-border hover:border-primary hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors"
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

                        if (preview) URL.revokeObjectURL(preview);
                        setPreview('');

                        form.setValue('shop_logo', undefined, {
                          shouldValidate: true,
                        });

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
                      PNG, JPG or SVG (max. 5MB)
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

                if (preview) URL.revokeObjectURL(preview);

                const previewUrl = URL.createObjectURL(file);
                setPreview(previewUrl);

                form.setValue('shop_logo', file, {
                  shouldValidate: true,
                });
              }}
            />

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}

function InteriorImages() {
  const { form } = useMultiStepForm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  return (
    <Controller
      name="interior_images"
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex flex-1 flex-col">
            <h2 className="mb-4 font-semibold">Interior Images</h2>

            <div
              className="border-border hover:border-primary hover:bg-muted/50 flex min-h-96 cursor-pointer flex-wrap gap-10 rounded-lg border-2 border-dashed p-12 text-center transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previews.length > 0 ? (
                previews.map((preview, index) => (
                  <div key={index} className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="bg-card border-border aspect-video h-64 overflow-hidden rounded-lg border-2">
                        <Image
                          src={preview}
                          alt="Interior Preview"
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
                          event.stopPropagation();

                          URL.revokeObjectURL(preview);

                          const newPreviews = previews.filter(
                            (_, i) => i !== index,
                          );
                          setPreviews(newPreviews);

                          const currentFiles =
                            form.getValues('interior_images') || [];

                          const newFiles = currentFiles.filter(
                            (_: File, i: number) => i !== index,
                          );

                          form.setValue('interior_images', newFiles, {
                            shouldValidate: true,
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="m-auto flex flex-col items-center gap-4 p-4">
                  <div className="bg-primary/10 text-primary rounded-full p-4">
                    <ImageIcon className="h-8 w-8" />
                  </div>

                  <div>
                    <p className="mb-1 font-medium">Add Interior Images</p>
                    <p className="text-muted-foreground text-sm">
                      PNG, JPG or SVG (max. 5MB)
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
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;

                const newPreviews = files.map((file) =>
                  URL.createObjectURL(file),
                );

                const updatedPreviews = [...previews, ...newPreviews];
                setPreviews(updatedPreviews);

                const currentFiles = form.getValues('interior_images') || [];

                form.setValue('interior_images', [...currentFiles, ...files], {
                  shouldValidate: true,
                });
              }}
            />

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}
