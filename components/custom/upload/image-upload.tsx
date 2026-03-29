'use client';

import * as React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadFieldProps {
  // Allow string (URL) or File in the onChange and defaultValue
  onChange?: (image: File | string | null) => void;
  defaultValue?: File | string | null;
}

export function ImageUploadField({
  onChange,
  defaultValue,
}: ImageUploadFieldProps) {
  // Initialize preview with defaultValue if it's a string (the URL)
  const [preview, setPreview] = React.useState<string | null>(
    typeof defaultValue === 'string' ? defaultValue : null,
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (defaultValue instanceof File) {
      const objectUrl = URL.createObjectURL(defaultValue);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof defaultValue === 'string') {
      // If the URL changes externally, update the preview
      setPreview(defaultValue);
    } else if (defaultValue === null) {
      setPreview(null);
    }
  }, [defaultValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      // Pass the actual File object back to the form
      onChange?.(file);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onChange?.(null);
  };

  return (
    <div className="h-full w-full">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        className="group border-muted-foreground/25 bg-muted/50 hover:bg-muted relative flex aspect-video min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed transition-all"
      >
        {preview ? (
          <div className="relative h-full w-full">
            {/* Note: If using Next.js Image with external URLs, 
                ensure the domain is in next.config.js 'remotePatterns' */}
            <Image
              src={preview}
              alt="Preview"
              fill
              unoptimized={
                typeof preview === 'string' && !preview.startsWith('blob:')
              }
              className="rounded-md object-cover"
            />

            <button
              type="button"
              onClick={removeImage}
              className="bg-destructive absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-110"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="text-xs font-semibold text-white">Change Image</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <ImageIcon className="text-muted-foreground mb-2 h-8 w-8" />
            <span className="text-muted-foreground text-sm font-medium">
              Click to upload product image
            </span>
            <span className="text-muted-foreground/60 mt-1 text-xs">
              PNG, JPG or WebP (Max 2MB)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
