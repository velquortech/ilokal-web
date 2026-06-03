'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_IMAGES = 10;

interface GalleryUploaderProps {
  businessId: string;
  value: string[];
  onChange: (urls: string[]) => void;
}

export function GalleryUploader({
  businessId,
  value,
  onChange,
}: GalleryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });

  const canAddMore = value.length < MAX_IMAGES;

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('businessId', businessId);

    const res = await fetch('/api/web/upload/business-interior', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) return null;
    return json.data.url as string;
  };

  const handleFiles = async (files: FileList) => {
    const remaining = MAX_IMAGES - value.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    setUploadCount({ done: 0, total: toUpload.length });

    const newUrls: string[] = [];
    for (const file of toUpload) {
      const url = await uploadFile(file);
      if (url) {
        newUrls.push(url);
      } else {
        toast.error(`Failed to upload ${file.name}`);
      }
      setUploadCount((c) => ({ ...c, done: c.done + 1 }));
    }

    if (newUrls.length > 0) onChange([...value, ...newUrls]);
    setUploading(false);
  };

  const removeImage = (url: string) => {
    onChange(value.filter((u) => u !== url));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-lg border"
          >
            <Image
              src={url}
              alt="Gallery image"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 30vw, 20vw"
              unoptimized
            />
            <button
              type="button"
              onClick={() => removeImage(url)}
              className={cn(
                'absolute top-1 right-1 flex size-5 items-center justify-center rounded-full',
                'bg-black/60 text-white opacity-0 transition-opacity',
                'hover:bg-destructive group-hover:opacity-100',
                'focus-visible:ring-ring focus-visible:opacity-100 focus-visible:ring-1 focus-visible:outline-none',
              )}
              aria-label="Remove image"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {/* Add tile */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-lg border-2 border-dashed',
              'border-border bg-muted transition-colors',
              'hover:border-primary hover:bg-primary/5',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              uploading && 'cursor-not-allowed opacity-60',
            )}
            aria-label="Add gallery photos"
          >
            {uploading ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
                <span className="text-muted-foreground text-xs">
                  {uploadCount.done}/{uploadCount.total}
                </span>
              </span>
            ) : (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <ImagePlus className="text-muted-foreground group-hover:text-primary size-5 transition-colors" />
                <span className="text-muted-foreground group-hover:text-primary text-xs transition-colors">
                  Add photos
                </span>
              </span>
            )}
          </button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        {value.length}/{MAX_IMAGES} photos · JPG, PNG or WebP · max 2 MB each
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
