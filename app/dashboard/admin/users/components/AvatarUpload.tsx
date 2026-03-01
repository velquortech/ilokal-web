'use client';

import React, { useState } from 'react';
import { createClient } from '@/config/client';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AvatarImage } from '@/components/custom/AvatarImage';

interface AvatarUploadProps {
  value: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
  currentAvatarUrl?: string | null;
}

export function AvatarUpload({
  onChange,
  disabled = false,
  currentAvatarUrl,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    currentAvatarUrl || null,
  );
  const supabase = React.useMemo(() => createClient(), []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = fileName;

      const supabaseClient = await supabase;

      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return;
      }

      // Get public URL
      const { data } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        onChange(data.publicUrl);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
  };

  return (
    <div className="flex flex-col gap-4">
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
            Recommended: Square image, at least 200x200px
          </p>
        </div>
      </div>
    </div>
  );
}
