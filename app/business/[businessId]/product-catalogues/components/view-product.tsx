import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PropsWithChildren } from 'react';
import type { ProductResponse } from '@/lib/types';
import { ProductCard } from '@/components/custom/ProductCard';
import { DialogTitle } from '@radix-ui/react-dialog';
import { VisuallyHidden } from 'radix-ui';

export function ViewProduct(props: PropsWithChildren & ProductResponse) {
  const { children, ...product } = props;
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={false} className="rounded-xl p-0 sm:w-sm">
        <VisuallyHidden.Root>
          <DialogTitle>Product Card</DialogTitle>
          <DialogDescription>Product Card</DialogDescription>
        </VisuallyHidden.Root>
        <ProductCard {...product} />
      </DialogContent>
    </Dialog>
  );
}
