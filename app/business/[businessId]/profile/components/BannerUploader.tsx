'use client';

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { SafeImage } from '@/components/custom/SafeImage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage, COMPRESSION_PRESETS } from '@/lib/utils/compressImage';

interface BannerUploaderProps {
  businessId: string;
  /** Public URL of the current banner (or null when none is set). */
  value: string | null;
  /** Pass `null` to clear the banner. */
  onChange: (url: string | null) => void;
}

export function BannerUploader({
  businessId,
  value,
  onChange,
}: BannerUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      // A phone photo is 3–6 MB and the route caps at 4 MB — compress to the
      // hero preset (1600px WebP) first, mirroring the logo uploader.
      const { file: upload } = await compressImage(file, {
        maxDimension: COMPRESSION_PRESETS.hero,
      });

      const formData = new FormData();
      formData.append('file', upload);
      formData.append('businessId', businessId);

      const res = await fetch('/api/web/upload/business-banner', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Banner upload failed');
        return;
      }

      onChange(json.data.url);
    } catch {
      toast.error('Banner upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="border-border bg-muted relative h-44 w-full overflow-hidden rounded-2xl border sm:h-56 md:h-64">
        {value ? (
          // SafeImage: unoptimized storage WebP + broken-image fallback.
          <SafeImage
            src={value}
            alt="Shop banner"
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="from-primary/20 via-primary/10 to-background absolute inset-0 bg-linear-to-br" />
        )}

        {/* Legibility gradient over a real photo */}
        {value && !uploading && (
          <div
            className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/30 to-transparent"
            aria-hidden="true"
          />
        )}

        {/* Remove — only when a banner exists */}
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove banner"
            className="absolute top-3 right-3 z-10 flex size-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <X className="size-4" />
          </button>
        )}

        {/* Change / add — the whole banner is the drop target */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={value ? 'Change banner' : 'Add banner photo'}
          className={cn(
            'group absolute inset-0 flex flex-col items-center justify-center gap-2 transition-colors',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            value
              ? 'bg-black/45 opacity-0 hover:opacity-100'
              : 'hover:bg-black/10',
            uploading && 'cursor-not-allowed opacity-100',
          )}
        >
          {uploading ? (
            <Loader2 className="size-7 animate-spin text-white" />
          ) : value ? (
            <Camera className="size-7 text-white" />
          ) : (
            <ImagePlus className="text-primary size-7" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              value ? 'text-white' : 'text-muted-foreground',
            )}
          >
            {uploading
              ? 'Uploading…'
              : value
                ? 'Change banner'
                : 'Add banner photo'}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="sr-only"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.target.value = '';
            if (picked) handleFile(picked);
          }}
        />
      </div>

      <p className="text-muted-foreground mt-1.5 text-xs">
        Wide landscape photo · fills the top of your shop page · JPG, PNG or
        WebP
      </p>
    </div>
  );
}
