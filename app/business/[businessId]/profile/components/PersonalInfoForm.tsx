'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Loader2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  updateCurrentUserProfileSchema,
  type UpdateCurrentUserProfileInput,
} from '@/lib/validation/auth';
import { updateCurrentUserProfileAction } from '@/app/(auth)/actions';
import type { User } from '@/lib/types/user';

interface PersonalInfoFormProps {
  user: User;
}

export function PersonalInfoForm({ user }: PersonalInfoFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateCurrentUserProfileInput>({
    resolver: zodResolver(updateCurrentUserProfileSchema),
    defaultValues: {
      full_name: user.full_name ?? '',
      phone_number: user.phone_number ?? '',
      avatar_url: user.avatar_url ?? '',
    },
  });

  const avatarUrl = watch('avatar_url');
  const initials = (user.full_name ?? user.email).slice(0, 2).toUpperCase();

  const handleAvatarFile = async (file: File) => {
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/web/upload/avatar', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Avatar upload failed');
        return;
      }

      // Avatar route returns { data: { publicUrl } }
      const newUrl: string = json.data?.publicUrl ?? json.data?.url;
      if (newUrl) {
        setValue('avatar_url', newUrl, { shouldDirty: true });
        toast.success('Photo uploaded — save changes to apply');
      }
    } catch {
      toast.error('Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const onSubmit = async (data: UpdateCurrentUserProfileInput) => {
    setIsSubmitting(true);
    try {
      const result = await updateCurrentUserProfileAction(data);
      if (!result.success) {
        toast.error(result.error?.message ?? 'Failed to update profile');
        return;
      }
      toast.success('Profile updated');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCircle className="size-4" />
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Avatar upload */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={avatarUploading}
              className="group focus-visible:ring-ring relative size-16 shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Change profile photo"
            >
              <Avatar className="size-16">
                <AvatarImage
                  src={avatarUrl || undefined}
                  alt={user.full_name ?? 'Avatar'}
                  className="object-cover"
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-100"
                aria-hidden
              >
                {avatarUploading ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <Camera className="size-4 text-white" />
                )}
              </span>
            </button>

            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Profile photo</p>
              <p className="text-muted-foreground text-xs">
                JPG, PNG or WebP · max 2 MB
              </p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarFile(file);
              e.target.value = '';
            }}
          />

          <Field>
            <FieldLabel htmlFor="full_name">Full Name</FieldLabel>
            <Input
              id="full_name"
              placeholder="Your full name"
              {...register('full_name')}
            />
            <FieldError>{errors.full_name?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="phone_number">Phone Number</FieldLabel>
            <Input
              id="phone_number"
              placeholder="+63 9xx xxx xxxx"
              {...register('phone_number')}
            />
            <FieldError>{errors.phone_number?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Email</FieldLabel>
            <p className="text-sm">{user.email}</p>
            <p className="text-muted-foreground text-xs">
              Email cannot be changed here.
            </p>
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || avatarUploading}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
