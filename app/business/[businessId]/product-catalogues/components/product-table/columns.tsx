'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { calculatePercentage } from '@/lib/product-helper';
import { formatOfferingPricePair } from '@/lib/utils/formatOfferingPrice';
import type { ProductResponse, ProductSectionWithCount } from '@/lib/types';
import { PRODUCT_STATUS_OPTIONS } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ViewProduct } from '../view-product';
import { ProductActions } from './product-actions';

function ProductImageCell({ product }: { product: ProductResponse }) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <ViewProduct {...product}>
      <div className="group relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-md border">
        {product.image_url && !imgError ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            unoptimized
            sizes="48px"
            className="object-cover transition group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="bg-muted flex h-full w-full items-center justify-center">
            <ImageOff className="text-muted-foreground size-5" />
          </div>
        )}
      </div>
    </ViewProduct>
  );
}

/**
 * A factory rather than a constant: the row actions need the shop's sections
 * so "Update" can offer a section picker, and TanStack has no other channel
 * for passing them to a cell.
 */
export function getColumns(
  sections?: ProductSectionWithCount[],
): ColumnDef<ProductResponse>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'image_url',
      header: 'Image',
      cell: ({ row }) => <ProductImageCell product={row.original} />,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {row.original.description}
          </p>
        </div>
      ),
    },
    {
      // The shop's OWN grouping. Distinct from `category`, which is the platform
      // taxonomy customers filter by on /explore — see .claude/CATALOGUES.md.
      accessorKey: 'section',
      header: 'Section',
      // Layer 1 of the mobile strategy (§6.8): the card view below `md` shows
      // only the essentials, so Section/Category never need to scroll sideways.
      meta: { responsiveClassName: 'hidden md:table-cell' },
      cell: ({ row }) =>
        row.original.section?.name ? (
          <Badge variant="outline">{row.original.section.name}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">Uncategorised</span>
        ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      // Layer 1 of the mobile strategy (§6.8) — hidden below `md`.
      meta: { responsiveClassName: 'hidden md:table-cell' },
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.category?.name ?? '—'}</Badge>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => {
        const { price, sale_price } = row.original;
        const { base, sale } = formatOfferingPricePair(row.original);
        // `sale` is null for quote-based rows, which have nothing to discount.
        if (sale && price != null && sale_price != null) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-primary font-semibold">{sale}</span>
              <span className="text-muted-foreground text-xs line-through">
                {base} (-{calculatePercentage(price, sale_price)}%)
              </span>
            </div>
          );
        }
        return <span>{base}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const option = PRODUCT_STATUS_OPTIONS.find(
          (o) => o.value === row.original.status,
        );
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  className={cn(
                    'inline-flex h-max w-max cursor-help items-center rounded-sm px-2 py-0.5 text-xs capitalize',
                    // Green stays reserved for success (the repo's standing
                    // rule), so only `active` gets it. `unlisted` was red,
                    // which reads as a fault — it is a deliberate hidden
                    // state, so it takes amber.
                    row.original.status === 'active' &&
                      'bg-green-600/10 text-green-700',
                    row.original.status === 'unlisted' &&
                      'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                    row.original.status === 'disabled' &&
                      'bg-muted text-muted-foreground',
                  )}
                >
                  {option?.label ?? row.original.status}
                </div>
              </TooltipTrigger>
              {option && (
                <TooltipContent>
                  <p className="max-w-52">{option.description}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row: { original: product } }) => (
        <ProductActions product={product} sections={sections} />
      ),
    },
  ];
}
