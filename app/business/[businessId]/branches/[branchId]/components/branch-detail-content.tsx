'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  MapPin,
  MapPinOff,
  Pencil,
  Phone,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EditBranchDialog } from '../../components/edit-branch';
import { DeleteBranchDialog } from '../../components/delete-branch';
import { businessBranchesPath } from '@/config/routeConfig';
import type { Branch, BranchStatus } from '@/lib/types';

function BranchStatusBadge({ status }: { status: BranchStatus }) {
  if (status === 'pending_review') {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-amber-700 dark:text-amber-400"
      >
        <Clock className="size-3.5" />
        Pending Review
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3.5" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="gap-1 text-green-700 dark:text-green-400"
    >
      Active
    </Badge>
  );
}

interface BranchDetailContentProps {
  branch: Branch;
  businessId: string;
}

export function BranchDetailContent({
  branch,
  businessId,
}: BranchDetailContentProps) {
  const router = useRouter();

  const handleSuccess = () => router.refresh();
  const handleDeleteSuccess = () =>
    router.push(businessBranchesPath(businessId));

  const [lat, lng] = branch.location
    ? [
        branch.location.coordinates[1].toFixed(6),
        branch.location.coordinates[0].toFixed(6),
      ]
    : [null, null];

  return (
    <div className="font-giest flex h-max flex-1 flex-col space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 size-8 shrink-0"
            asChild
          >
            <Link href={businessBranchesPath(businessId)}>
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back to branches</span>
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{branch.name}</h1>
              <BranchStatusBadge status={branch.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              Branch details and management
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <EditBranchDialog branch={branch} onSuccess={handleSuccess}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="size-4" />
              Edit Branch
            </Button>
          </EditBranchDialog>
          <DeleteBranchDialog branch={branch} onSuccess={handleDeleteSuccess}>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive gap-2"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </DeleteBranchDialog>
        </div>
      </div>

      {/* Cover image */}
      {branch.cover_image_url && (
        <div className="bg-muted relative h-52 w-full overflow-hidden rounded-lg sm:h-64">
          <Image
            src={branch.cover_image_url}
            alt={`${branch.name} cover`}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      )}

      {/* Rejection reason alert */}
      {branch.status === 'rejected' && branch.rejection_reason && (
        <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          <span className="font-medium">Rejection reason: </span>
          {branch.rejection_reason}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="text-muted-foreground size-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {branch.address ? (
              <p className="text-sm">{branch.address}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No address provided
              </p>
            )}
            <Separator />
            {lat && lng ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Coordinates
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1 text-green-700 dark:text-green-400"
                  >
                    <MapPin className="size-3" />
                    On map
                  </Badge>
                  <span className="text-muted-foreground font-mono text-xs">
                    {lat}, {lng}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <MapPinOff className="text-muted-foreground size-3" />
                  No coordinates
                </Badge>
                <span className="text-muted-foreground text-xs">
                  Edit branch to add map location
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="text-muted-foreground size-4" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {branch.phone ? (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="text-muted-foreground size-4 shrink-0" />
                <span>{branch.phone}</span>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No phone number</p>
            )}
            {branch.email ? (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate">{branch.email}</span>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No email address</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {branch.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{branch.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Gallery */}
      {branch.gallery_images.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Gallery ({branch.gallery_images.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {branch.gallery_images.map((url, i) => (
                <div
                  key={i}
                  className="bg-muted relative aspect-square overflow-hidden rounded-md"
                >
                  <Image
                    src={url}
                    alt={`Gallery image ${i + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="flex flex-wrap gap-6 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="text-muted-foreground size-4" />
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(branch.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="text-muted-foreground size-4" />
            <span className="text-muted-foreground">Last updated</span>
            <span>{new Date(branch.updated_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
