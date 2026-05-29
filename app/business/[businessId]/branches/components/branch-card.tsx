'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
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
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { EditBranchDialog } from './edit-branch';
import { DeleteBranchDialog } from './delete-branch';
import { businessBranchPath } from '@/config/routeConfig';
import type { Branch, BranchStatus } from '@/lib/types';

function BranchStatusBadge({ status }: { status: BranchStatus }) {
  if (status === 'pending_review') {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-amber-700 dark:text-amber-400"
      >
        <Clock className="size-3" />
        Pending Review
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3" />
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

interface BranchCardProps {
  branch: Branch;
  businessId: string;
  onSuccess: () => void;
}

export function BranchCard({ branch, businessId, onSuccess }: BranchCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="bg-muted relative h-36">
        {branch.cover_image_url ? (
          <Image
            src={branch.cover_image_url}
            alt={branch.name}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="text-muted-foreground/30 size-10" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <BranchStatusBadge status={branch.status} />
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="leading-tight font-semibold">{branch.name}</h3>

        {branch.address && (
          <div className="text-muted-foreground flex items-start gap-1.5 text-sm">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2">{branch.address}</span>
          </div>
        )}

        {branch.phone && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Phone className="size-3.5 shrink-0" />
            <span>{branch.phone}</span>
          </div>
        )}

        {branch.email && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{branch.email}</span>
          </div>
        )}

        {branch.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {branch.description}
          </p>
        )}

        <div className="mt-auto pt-1">
          {branch.location ? (
            <Badge
              variant="secondary"
              className="gap-1 text-xs text-green-700 dark:text-green-400"
            >
              <MapPin className="size-3" />
              On map
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs">
              <MapPinOff className="text-muted-foreground size-3" />
              No coordinates
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-2 p-4 pt-0">
        <Button asChild size="sm" className="flex-1">
          <Link href={businessBranchPath(businessId, branch.id)}>
            Manage Branch
          </Link>
        </Button>
        <EditBranchDialog branch={branch} onSuccess={onSuccess}>
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Edit</span>
          </Button>
        </EditBranchDialog>
        <DeleteBranchDialog branch={branch} onSuccess={onSuccess}>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-8"
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </DeleteBranchDialog>
      </CardFooter>
    </Card>
  );
}
