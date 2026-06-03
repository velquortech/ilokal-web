'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Loader2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LogoUploaderProps {
  businessId: string;
  value: string | null;
  onChange: (url: string) => void;
}

export function LogoUploader({ businessId, value, onChange }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', businessId);

      const res = await fetch('/api/web/upload/business-logo', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Logo upload failed');
        return;
      }

      onChange(json.data.url);
    } catch {
      toast.error('Logo upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          'group relative size-24 overflow-hidden rounded-xl border-2 border-dashed',
          'border-border bg-muted transition-colors',
          'hover:border-primary hover:bg-primary/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          uploading && 'cursor-not-allowed opacity-60',
        )}
        aria-label="Upload business logo"
      >
        {value ? (
          <Image
            src={value}
            alt="Business logo"
            fill
            className="object-cover"
            sizes="96px"
            unoptimized
          />
        ) : (
          <Store className="text-muted-foreground absolute inset-0 m-auto size-8" />
        )}

        {/* hover overlay */}
        <span
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-1',
            'bg-black/50 opacity-0 transition-opacity group-hover:opacity-100',
            uploading && 'opacity-100',
          )}
          aria-hidden
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-white" />
          ) : (
            <Camera className="size-5 text-white" />
          )}
          <span className="text-xs font-medium text-white">
            {uploading ? 'Uploading…' : 'Change'}
          </span>
        </span>
      </button>

      <p className="text-muted-foreground text-xs">
        JPG, PNG or WebP · max 2 MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
