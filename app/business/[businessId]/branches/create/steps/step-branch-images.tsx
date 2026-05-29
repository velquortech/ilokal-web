'use client';

import { Controller } from 'react-hook-form';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import { ImageIcon, Upload, X } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useBranchForm } from '../provider/branch-form-provider';

export function StepBranchImages() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <CoverImageUpload />

      <div className="bg-muted/50 border-border space-y-2 rounded-lg border p-4">
        <p className="text-foreground text-sm font-medium">Cover Photo Tips:</p>
        <ul className="text-foreground list-inside list-disc space-y-1 text-sm">
          <li>Use a landscape image for best display (16:9 works great)</li>
          <li>Minimum 1200×630 pixels recommended</li>
          <li>Shown as the banner on your branch shop page</li>
        </ul>
      </div>

      <GalleryImagesUpload />

      <div className="bg-muted/50 border-border space-y-2 rounded-lg border p-4">
        <p className="text-foreground text-sm font-medium">Gallery Tips:</p>
        <ul className="text-foreground list-inside list-disc space-y-1 text-sm">
          <li>Show different angles of your branch location</li>
          <li>Good lighting and clean spaces look best</li>
          <li>Up to 10 images, max 2 MB each</li>
        </ul>
      </div>
    </div>
  );
}

function CoverImageUpload() {
  const { form, cacheFile, clearFileCache } = useBranchForm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFile = form.watch('cover_image') as File | undefined;
  const [preview, setPreview] = useState<string>();

  useEffect(() => {
    if (coverFile instanceof File) {
      const url = URL.createObjectURL(coverFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(undefined);
    }
  }, [coverFile]);

  return (
    <Controller
      name="cover_image"
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold">Cover Photo (Optional)</h2>

            <div
              className="border-border hover:border-primary hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-full">
                    <div className="bg-card relative h-48 w-full overflow-hidden rounded-lg border-2">
                      <Image
                        src={preview}
                        alt="Cover preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 rounded-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.setValue('cover_image', undefined, {
                          shouldValidate: true,
                        });
                        clearFileCache('cover_image');
                        if (fileInputRef.current)
                          fileInputRef.current.value = '';
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
                    <p className="mb-1 font-medium">Upload cover photo</p>
                    <p className="text-muted-foreground text-sm">
                      PNG, JPG or WebP (max 2 MB)
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
                form.setValue('cover_image', file, { shouldValidate: true });
                cacheFile('cover_image', file);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}

function GalleryImageItem({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: (i: number) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!preview) return null;

  return (
    <div className="relative">
      <div className="bg-card border-border aspect-video overflow-hidden rounded-lg border-2">
        <Image
          src={preview}
          alt={`Gallery ${index + 1}`}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <Button
        variant="destructive"
        size="icon"
        className="absolute -top-2 -right-2 rounded-full"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function GalleryImagesUpload() {
  const { form, cacheFiles, clearFileCache } = useBranchForm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFiles = (form.watch('gallery_images') as File[]) ?? [];

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const current = form.getValues('gallery_images') ?? [];
    const merged = [...current, ...files].slice(0, 10);
    form.setValue('gallery_images', merged, { shouldValidate: true });
    cacheFiles('gallery_images', merged);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (idx: number) => {
    const current = form.getValues('gallery_images') ?? [];
    const next = current.filter((_: File, i: number) => i !== idx);
    form.setValue('gallery_images', next, { shouldValidate: true });
    clearFileCache('gallery_images');
    if (next.length > 0) cacheFiles('gallery_images', next);
  };

  return (
    <Controller
      name="gallery_images"
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Gallery Images (Optional)</h2>
              {galleryFiles.length > 0 && galleryFiles.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-3 w-3" />
                  Add More
                </Button>
              )}
            </div>

            <div
              className={`border-border hover:border-primary hover:bg-muted/50 min-h-40 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                galleryFiles.length > 0
                  ? 'grid grid-cols-2 gap-4 sm:grid-cols-3'
                  : ''
              }`}
              onClick={
                galleryFiles.length === 0
                  ? () => fileInputRef.current?.click()
                  : undefined
              }
            >
              {galleryFiles.length > 0 ? (
                galleryFiles.map((file: File, idx: number) => (
                  <GalleryImageItem
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    file={file}
                    index={idx}
                    onRemove={handleRemove}
                  />
                ))
              ) : (
                <div className="m-auto flex flex-col items-center gap-4 p-4">
                  <div className="bg-primary/10 text-primary rounded-full p-4">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="mb-1 font-medium">Add Gallery Images</p>
                    <p className="text-muted-foreground text-sm">
                      PNG, JPG or WebP — select multiple (max 10)
                    </p>
                  </div>
                  <Button type="button" variant="secondary">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose Files
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
              onChange={handleAdd}
            />

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}
