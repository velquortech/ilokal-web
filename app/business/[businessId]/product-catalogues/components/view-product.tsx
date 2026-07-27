'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PropsWithChildren } from 'react';
import type { ProductResponse } from '@/lib/types';
import { ProductCard } from '@/components/custom/ProductCard';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import { DialogTitle } from '@radix-ui/react-dialog';
import { VisuallyHidden } from 'radix-ui';

export function ViewProduct(props: PropsWithChildren & ProductResponse) {
  const { children, ...product } = props;
  // Screen-reader-only label: a salon's dialog should announce "Service Card".
  const vocabulary = useOfferingVocabulary();
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="rounded-xl p-0 sm:w-sm sm:p-0"
      >
        <VisuallyHidden.Root>
          <DialogTitle>{vocabulary.singular} Card</DialogTitle>
          <DialogDescription>{vocabulary.singular} Card</DialogDescription>
        </VisuallyHidden.Root>
        <ProductCard {...product} />
      </DialogContent>
    </Dialog>
  );
}
