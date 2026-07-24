'use client';

import * as React from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageIcon, Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { updateBranchSchema } from '@/lib/validation/branches';
import {
  updateBranchAction,
  uploadBranchImageAction,
} from '../../actions/branchActions';
import type { Branch, UpdateBranchRequest } from '@/lib/types';

interface EditBranchDialogProps {
  children: React.ReactNode;
  branch: Branch;
  onSuccess?: () => void;
}

export function EditBranchDialog({
  children,
  branch,
  onSuccess,
}: EditBranchDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Image state — work with URLs directly
  const [coverUrl, setCoverUrl] = React.useState<string | null>(
    branch.cover_image_url ?? null,
  );
  const [galleryUrls, setGalleryUrls] = React.useState<string[]>(
    branch.gallery_images ?? [],
  );
  const [coverUploading, setCoverUploading] = React.useState(false);
  const [galleryUploading, setGalleryUploading] = React.useState(false);

  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  const defaultValues: UpdateBranchRequest = {
    name: branch.name,
    address: branch.address ?? '',
    latitude: branch.location?.coordinates?.[1] ?? undefined,
    longitude: branch.location?.coordinates?.[0] ?? undefined,
    phone: branch.phone ?? '',
    email: branch.email ?? '',
    description: branch.description ?? '',
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateBranchRequest>({
    resolver: zodResolver(updateBranchSchema),
    defaultValues,
  });

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadBranchImageAction(fd);
      if (!res.success) {
        toast.error(res.error?.message ?? 'Cover upload failed');
        return;
      }
      setCoverUrl(res.data!.url);
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setGalleryUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await uploadBranchImageAction(fd);
        if (res.success && res.data?.url) newUrls.push(res.data.url);
      }
      setGalleryUrls((prev) => [...prev, ...newUrls].slice(0, 10));
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: UpdateBranchRequest) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const result = await updateBranchAction(branch.id, {
        ...data,
        cover_image_url: coverUrl,
        gallery_images: galleryUrls,
      });
      if (!result.success) {
        const msg = result.error?.message ?? 'Failed to update branch';
        setServerError(msg);
        toast.error(msg);
        return;
      }
      toast.success(`Branch "${data.name ?? branch.name}" updated`);
      setOpen(false);
      onSuccess?.();
    } catch {
      const msg = 'An unexpected error occurred';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      reset(defaultValues);
      setCoverUrl(branch.cover_image_url ?? null);
      setGalleryUrls(branch.gallery_images ?? []);
      setServerError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden sm:max-w-lg">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>
              Update the details for this branch location.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Field>
              <FieldLabel className={errors.name ? 'text-destructive' : ''}>
                Branch Name
              </FieldLabel>
              <Input
                {...register('name')}
                placeholder="e.g. Main Branch"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>Description (Optional)</FieldLabel>
              <Textarea
                {...register('description')}
                placeholder="Brief description of this branch"
                className="resize-none"
                rows={2}
              />
              {errors.description && (
                <FieldError>{errors.description.message}</FieldError>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Phone (Optional)</FieldLabel>
                <Input
                  type="tel"
                  {...register('phone')}
                  placeholder="e.g. 0917 123 4567"
                />
                {errors.phone && (
                  <FieldError>{errors.phone.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel>Email (Optional)</FieldLabel>
                <Input
                  type="email"
                  {...register('email')}
                  placeholder="branch@example.com"
                />
                {errors.email && (
                  <FieldError>{errors.email.message}</FieldError>
                )}
              </Field>
            </div>

            <Field>
              <FieldLabel className={errors.address ? 'text-destructive' : ''}>
                Address
              </FieldLabel>
              <Input
                {...register('address')}
                placeholder="e.g. 123 Iznart St., Iloilo City"
                className={errors.address ? 'border-destructive' : ''}
              />
              {errors.address && (
                <FieldError>{errors.address.message}</FieldError>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Latitude (Optional)</FieldLabel>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 10.7312"
                  {...register('latitude', {
                    setValueAs: (v) =>
                      v === '' || v === undefined ? undefined : parseFloat(v),
                  })}
                />
                {errors.latitude && (
                  <FieldError>{errors.latitude.message}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel>Longitude (Optional)</FieldLabel>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 122.5649"
                  {...register('longitude', {
                    setValueAs: (v) =>
                      v === '' || v === undefined ? undefined : parseFloat(v),
                  })}
                />
                {errors.longitude && (
                  <FieldError>{errors.longitude.message}</FieldError>
                )}
              </Field>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Cover Photo</p>
              {coverUrl ? (
                <div className="relative h-36 w-full overflow-hidden rounded-lg border">
                  <Image
                    src={coverUrl}
                    alt="Cover"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="size-7"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      <Upload className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="size-7"
                      onClick={() => setCoverUrl(null)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="border-border hover:border-primary hover:bg-muted/50 flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm transition-colors"
                >
                  {coverUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="text-muted-foreground size-5" />
                      <span className="text-muted-foreground">
                        Upload cover photo
                      </span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </div>

            {/* Gallery Images */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Gallery ({galleryUrls.length}/10)
                </p>
                {galleryUrls.length < 10 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={galleryUploading}
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    {galleryUploading ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <Plus className="mr-1 size-3" />
                    )}
                    Add Photos
                  </Button>
                )}
              </div>

              {galleryUrls.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {galleryUrls.map((url, i) => (
                    <div
                      key={i}
                      className="group relative aspect-square overflow-hidden rounded-md border"
                    >
                      <Image
                        src={url}
                        alt={`Gallery ${i + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setGalleryUrls((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={galleryUploading}
                  className="border-border hover:border-primary hover:bg-muted/50 flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm transition-colors"
                >
                  {galleryUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="text-muted-foreground size-5" />
                      <span className="text-muted-foreground">
                        Add gallery photos
                      </span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleGalleryUpload}
              />
            </div>

            {serverError && (
              <p className="text-destructive text-sm">{serverError}</p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-24">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
