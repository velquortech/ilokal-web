'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useBranchForm } from '../provider/branch-form-provider';
import {
  FileText,
  ImageIcon,
  Layers,
  MapPin,
  Phone,
  Mail,
  AlignLeft,
  Info,
} from 'lucide-react';

export function StepBranchReview() {
  const { form } = useBranchForm();
  const values = form.getValues();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-muted-foreground text-sm">
        Review your branch details before submitting. Once submitted, an admin
        will review your application within 24–48 hours.
      </p>

      <Section title="Branch Info">
        <Row icon={Info} label="Name" value={values.name} />
        {values.phone && (
          <Row icon={Phone} label="Phone" value={values.phone} />
        )}
        {values.email && <Row icon={Mail} label="Email" value={values.email} />}
        {values.description && (
          <Row
            icon={AlignLeft}
            label="Description"
            value={values.description}
          />
        )}
      </Section>

      <Section title="Location">
        <Row icon={MapPin} label="Address" value={values.address} />
        {values.latitude !== undefined && values.longitude !== undefined && (
          <Row
            icon={MapPin}
            label="Coordinates"
            value={`${values.latitude}, ${values.longitude}`}
          />
        )}
      </Section>

      <Section title="Photos">
        <PhotosPreview />
      </Section>

      <Section title="Documents">
        {values.business_permit ? (
          <Row
            icon={FileText}
            label="Business Permit"
            value={values.business_permit.name}
          />
        ) : (
          <p className="text-muted-foreground text-xs italic">
            No business permit uploaded
          </p>
        )}
        {values.other_document && (
          <Row
            icon={Layers}
            label="Supporting Document"
            value={values.other_document.name}
          />
        )}
      </Section>

      <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
        <p className="text-primary text-sm font-medium">What happens next?</p>
        <p className="text-muted-foreground mt-1 text-xs">
          After submission your branch will be in{' '}
          <strong>Pending Review</strong> status. It won&apos;t appear in the
          branch selector until an admin approves it. You&apos;ll see it listed
          on your Branches page with its current status.
        </p>
      </div>
    </div>
  );
}

function PhotosPreview() {
  const { form } = useBranchForm();
  const coverFile = form.watch('cover_image') as File | undefined;
  const galleryFiles = (form.watch('gallery_images') as File[]) ?? [];
  const [coverUrl, setCoverUrl] = useState<string>();
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  useEffect(() => {
    if (coverFile instanceof File) {
      const url = URL.createObjectURL(coverFile);
      setCoverUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverUrl(undefined);
    }
  }, [coverFile]);

  useEffect(() => {
    const urls = galleryFiles
      .filter((f) => f instanceof File)
      .map((f) => URL.createObjectURL(f));
    setGalleryUrls(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [galleryFiles]);

  if (!coverUrl && galleryUrls.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-xs italic">
        No photos uploaded
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {coverUrl && (
        <div className="relative size-20 overflow-hidden rounded-md border">
          <Image
            src={coverUrl}
            alt="Cover"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute right-0 bottom-0 left-0 bg-black/50 py-0.5 text-center text-[10px] text-white">
            Cover
          </div>
        </div>
      )}
      {galleryUrls.map((url, i) => (
        <div
          key={i}
          className="relative size-20 overflow-hidden rounded-md border"
        >
          <Image
            src={url}
            alt={`Gallery ${i + 1}`}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="bg-primary/70 absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-sm">
            <ImageIcon className="size-2.5 text-white" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
