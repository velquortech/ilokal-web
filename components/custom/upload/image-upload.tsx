'use client';

import * as React from 'react';
import { Image as ImageIcon, Loader2, X } from 'lucide-react';
import { SafeImage } from '@/components/custom/SafeImage';
import {
  compressImage,
  describeCompression,
  COMPRESSION_PRESETS,
} from '@/lib/utils/compressImage';

const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const DEFAULT_MAX_SIZE_LABEL = '2 MB';

interface ImageUploadFieldProps {
  onChange?: (image: File | string | null) => void;
  onError?: (message: string | null) => void;
  defaultValue?: File | string | null;
  maxSizeBytes?: number;
  maxSizeLabel?: string;
  allowedTypes?: string[];
  sizeErrorMessage?: string;
  typeErrorMessage?: string;
  /**
   * Longest edge to compress to, from `COMPRESSION_PRESETS`. Defaults to the
   * product preset, which is what every current caller uses this field for.
   */
  maxDimension?: number;
}

export function ImageUploadField({
  onChange,
  onError,
  defaultValue,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  maxSizeLabel = DEFAULT_MAX_SIZE_LABEL,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  sizeErrorMessage,
  typeErrorMessage,
  maxDimension = COMPRESSION_PRESETS.product,
}: ImageUploadFieldProps) {
  const [preview, setPreview] = React.useState<string | null>(
    typeof defaultValue === 'string' ? defaultValue : null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (defaultValue instanceof File) {
      const objectUrl = URL.createObjectURL(defaultValue);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof defaultValue === 'string') {
      setPreview(defaultValue);
    } else if (defaultValue === null) {
      setPreview(null);
    }
  }, [defaultValue]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!allowedTypes.includes(picked.type)) {
      const msg =
        typeErrorMessage ?? 'Only JPEG, PNG, GIF, or WebP images are allowed';
      setError(msg);
      setNote(null);
      onError?.(msg);
      e.target.value = '';
      return;
    }

    // Compress BEFORE the size check, not after it. A phone photo is 3–6 MB, so
    // rejecting first means the most common way an owner produces a picture —
    // photographing their own shop — is simply refused. The cap is a transport
    // limit; this is what lets a real photo satisfy it.
    setIsCompressing(true);
    setError(null);
    onError?.(null);
    const result = await compressImage(picked, {
      maxBytes: maxSizeBytes,
      maxDimension,
    });
    setIsCompressing(false);

    const file = result.file;

    if (file.size > maxSizeBytes) {
      // Says WHY it could not be used — HEIC, animation, or genuinely enormous
      // — rather than repeating the size rule the owner just failed.
      const msg =
        describeCompression(result, maxSizeLabel) ??
        sizeErrorMessage ??
        `Image must be smaller than ${maxSizeLabel}`;
      setError(msg);
      setNote(null);
      onError?.(msg);
      e.target.value = '';
      return;
    }

    setNote(describeCompression(result, maxSizeLabel));
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onChange?.(file);
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    setNote(null);
    onError?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onChange?.(null);
  };

  return (
    <div className="h-full w-full space-y-1.5">
      <input
        type="file"
        accept={allowedTypes.join(',')}
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div
        onClick={() => !isCompressing && fileInputRef.current?.click()}
        aria-busy={isCompressing}
        className={`group border-muted-foreground/25 bg-muted/50 hover:bg-muted relative flex aspect-video min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed transition-all ${error ? 'border-destructive' : ''}`}
      >
        {isCompressing ? (
          // A 5 MB photo takes a beat to decode and re-encode. Without this the
          // control looks frozen at exactly the moment it is doing the work
          // that makes the upload possible.
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <span className="text-sm font-medium">Resizing your image…</span>
          </div>
        ) : preview ? (
          <div className="relative h-full w-full">
            {/* SafeImage: unoptimized storage WebP + broken-image fallback
                (a stored URL that no longer exists shows the placeholder;
                blob previews can't fail). */}
            <SafeImage
              src={preview}
              alt="Preview"
              fill
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
              PNG, JPG, GIF or WebP (Max {maxSizeLabel})
            </span>
          </div>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {!error && note && (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {note}
        </p>
      )}
    </div>
  );
}
