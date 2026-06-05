'use client';

import React, { useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AvatarImage } from '@/components/custom/AvatarImage';
import { ROUTES } from '@/config/routeConfig';

export interface AvatarUploadProps {
  value: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
  currentAvatarUrl?: string | null;
  userId?: string; // Profile owner ID for avatar storage path
}

export function AvatarUpload({
  value,
  onChange,
  disabled = false,
  currentAvatarUrl,
  userId,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    value || currentAvatarUrl || null,
  );
  const [error, setError] = useState<string | null>(null);

  // Sync preview with form value when it changes
  React.useEffect(() => {
    if (value) {
      setPreview(value);
    } else if (!value && !uploading) {
      setPreview(currentAvatarUrl || null);
    }
  }, [value, currentAvatarUrl, uploading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // Validate file (client-side pre-check)
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
      if (file.size > MAX_FILE_SIZE) {
        setError('File size must be less than 2MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload via server API route (uses httpOnly cookie auth)
      const formData = new FormData();
      formData.append('file', file);
      if (userId) {
        formData.append('userId', userId);
      }

      const response = await fetch(`${ROUTES.API.UPLOAD}/avatar`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Upload error:', result.message);
        setError(`Upload failed: ${result.message}`);
        setPreview(null);
        return;
      }

      if (result.publicUrl) {
        onChange(result.publicUrl);
        setError(null);
      } else {
        setError('Failed to get public URL');
        setPreview(null);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error uploading avatar:', error);
      setError(`Upload error: ${errorMessage}`);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onChange('');
    // Reset input value
    const input = document.getElementById('avatar-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex items-end gap-4">
        {/* Preview */}
        {preview ? (
          <div className="relative">
            <AvatarImage
              src={preview}
              alt="Avatar preview"
              width={96}
              height={96}
              className="rounded-lg border border-gray-300 object-cover"
            />
            <button
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="absolute -top-2 -right-2 rounded-full bg-white p-1 shadow-md hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-red-600" />
            </button>
          </div>
        ) : (
          <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"></div>
        )}

        {/* Upload Button */}
        <div className="flex flex-1 flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            className="gap-2"
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Avatar'}
          </Button>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled || uploading}
            className="hidden"
          />
          <p className="text-xs text-gray-500">
            Recommended: Square image, at least 200x200px (max 2MB)
          </p>
        </div>
      </div>
    </div>
  );
}
