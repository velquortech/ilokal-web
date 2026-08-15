'use client';

import Link from 'next/link';
import { Pencil, Plus, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import {
  businessAddOfferingPath,
  businessProfilePath,
  businessShopGalleryPath,
} from '@/config/routeConfig';

/**
 * The owner toolbar on the customer-preview page.
 *
 * The page below is exactly what customers see, so the only owner affordances
 * here are "go edit the real thing" links. Each one points at the surface that
 * actually owns the data — Profile (business info), Catalogues (offerings),
 * Gallery (photos) — instead of duplicating an editor on a preview page.
 */
export function ShopOwnerToolbar({ businessId }: { businessId: string }) {
  const vocabulary = useOfferingVocabulary();

  return (
    <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <p className="text-muted-foreground text-sm">
        This is your shop page — what customers see. Changes you make on
        Profile, your {vocabulary.catalogue.toLowerCase()} and Gallery show up
        here automatically.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={businessProfilePath(businessId)}>
            <Pencil />
            Edit profile
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={businessAddOfferingPath(businessId)}>
            <Plus />
            {vocabulary.addLabel}
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={businessShopGalleryPath(businessId)}>
            <Images />
            Manage gallery
          </Link>
        </Button>
      </div>
    </div>
  );
}
