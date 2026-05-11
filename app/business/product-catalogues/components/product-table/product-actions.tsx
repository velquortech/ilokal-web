import { Product } from '@/app/business/libs/types/product.type';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Ellipsis, Eye, Tag, BadgePercent } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UpdateProductDialog } from '../update-product';
import { DropdownMenuSub } from '@radix-ui/react-dropdown-menu';
import { DeleteProductDialog } from '../delete-product';
import { ViewProduct } from '../view-product';
import { ApplySale } from '../apply-sale';

export function ProductActions(product: Product) {
  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <ViewProduct {...product}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Eye />
              View Card
            </DropdownMenuItem>
          </ViewProduct>
          <UpdateProductDialog product={product}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil />
              Edit Product
            </DropdownMenuItem>
          </UpdateProductDialog>
          <ApplySale product={product}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <BadgePercent />
              Apply Sale
            </DropdownMenuItem>
          </ApplySale>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tag />
              Set Status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={product.status}>
                <DropdownMenuRadioItem value="active" className="capitalize">
                  Active
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="unlisted" className="capitalize">
                  Unlisted
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="disabled" className="capitalize">
                  Disabled
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DeleteProductDialog product={product}>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DeleteProductDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
