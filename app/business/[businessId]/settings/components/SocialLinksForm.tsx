'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SocialLinks } from '@/lib/types';

interface SocialLinksFormProps {
  value: SocialLinks;
  onChange: (v: SocialLinks) => void;
}

const FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] =
  [
    {
      key: 'facebook',
      label: 'Facebook',
      placeholder: 'https://facebook.com/yourpage',
    },
    {
      key: 'instagram',
      label: 'Instagram',
      placeholder: 'https://instagram.com/yourhandle',
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      placeholder: 'https://tiktok.com/@yourhandle',
    },
    {
      key: 'website',
      label: 'Website',
      placeholder: 'https://yourbusiness.com',
    },
  ];

export function SocialLinksForm({ value, onChange }: SocialLinksFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <Label htmlFor={`social-${key}`} className="text-sm">
            {label}
          </Label>
          <Input
            id={`social-${key}`}
            type="url"
            placeholder={placeholder}
            value={value[key] ?? ''}
            onChange={(e) =>
              onChange({ ...value, [key]: e.target.value || null })
            }
          />
        </div>
      ))}
    </div>
  );
}
