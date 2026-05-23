'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { BadgePercent, Check, Loader2, Percent, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { calculatePercentage } from '@/lib/product-helper';
import {
  applySaleAction,
  removeSaleAction,
} from '../../actions/productActions';
import type { ProductResponse } from '@/lib/types';

interface ApplySaleProps {
  product: ProductResponse;
  children: React.ReactNode;
}

type SaleFormValues = {
  price: number;
  salePrice: number | undefined;
  percentInput: string;
  sale_starts_at: string;
  sale_ends_at: string;
};

const QUICK_DISCOUNTS = [10, 25, 50, 70];

export function ApplySale({ product, children }: ApplySaleProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const hasActiveSale = product.sale_price !== null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SaleFormValues>({
    defaultValues: {
      price: product.price,
      salePrice: product.sale_price ?? undefined,
      percentInput: product.sale_price
        ? String(calculatePercentage(product.price, product.sale_price))
        : '',
      sale_starts_at: product.sale_starts_at
        ? toDatetimeLocal(product.sale_starts_at)
        : '',
      sale_ends_at: product.sale_ends_at
        ? toDatetimeLocal(product.sale_ends_at)
        : '',
    },
  });

  const watchPrice = watch('price');
  const watchSalePrice = watch('salePrice');

  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = parseFloat(e.target.value);
    if (!isNaN(p) && p > 0 && p < 100) {
      const calculated = watchPrice - (watchPrice * p) / 100;
      setValue('salePrice', parseFloat(calculated.toFixed(2)), {
        shouldValidate: true,
      });
    } else if (e.target.value === '') {
      setValue('salePrice', undefined);
    }
  };

  const applyQuickDiscount = (p: number) => {
    const calculated = watchPrice - (watchPrice * p) / 100;
    setValue('salePrice', parseFloat(calculated.toFixed(2)), {
      shouldValidate: true,
    });
    setValue('percentInput', p.toString());
  };

  const discount = React.useMemo(() => {
    if (!watchPrice || !watchSalePrice || watchSalePrice >= watchPrice)
      return 0;
    return calculatePercentage(watchPrice, watchSalePrice);
  }, [watchPrice, watchSalePrice]);

  const onSubmit = async (data: SaleFormValues) => {
    if (!data.salePrice) return;
    setIsPending(true);
    setServerError(null);
    try {
      const result = await applySaleAction(product.id, {
        sale_price: data.salePrice,
        sale_starts_at: data.sale_starts_at
          ? new Date(data.sale_starts_at).toISOString()
          : null,
        sale_ends_at: data.sale_ends_at
          ? new Date(data.sale_ends_at).toISOString()
          : null,
      });
      if (!result.success) {
        const msg = result.error?.message ?? 'Failed to apply sale';
        setServerError(msg);
        toast.error(msg);
        return;
      }
      toast.success(`Sale applied to "${product.name}"`);
      setOpen(false);
      router.refresh();
    } catch {
      const msg = 'An unexpected error occurred';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  const handleRemoveSale = async () => {
    setIsRemoving(true);
    setServerError(null);
    try {
      const result = await removeSaleAction(product.id);
      if (!result.success) {
        const msg = result.error?.message ?? 'Failed to remove sale';
        setServerError(msg);
        toast.error(msg);
        return;
      }
      toast.success(`Sale removed from "${product.name}"`);
      setOpen(false);
      router.refresh();
    } catch {
      const msg = 'An unexpected error occurred';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setServerError(null);
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgePercent className="text-primary" />
            Apply Sale
          </DialogTitle>
          <DialogDescription>
            Set a discount for <strong>{product.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {hasActiveSale && (
          <div className="bg-primary/5 border-primary/20 flex items-center justify-between rounded-md border px-3 py-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Active sale: </span>
              <span className="text-primary font-semibold">
                ₱{product.sale_price}
              </span>
              <span className="text-muted-foreground ml-1 text-xs">
                (-{calculatePercentage(product.price, product.sale_price!)}%)
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-7 gap-1 text-xs"
              disabled={isRemoving}
              onClick={handleRemoveSale}
            >
              {isRemoving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3" />
              )}
              Remove
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="price" className="text-muted-foreground">
              Original Price
            </Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                ₱
              </span>
              <Input
                id="price"
                type="number"
                tabIndex={-1}
                readOnly
                className="bg-muted/50 cursor-not-allowed border-none pl-8 font-medium opacity-70 focus-visible:ring-0"
                {...register('price')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Quick Percent</Label>
            <div className="flex gap-2">
              {QUICK_DISCOUNTS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  tabIndex={-1}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'hover:border-primary hover:text-primary h-8 flex-1 rounded-md font-bold transition-all',
                    discount === p &&
                      'bg-primary/10 border-primary text-primary',
                  )}
                  onClick={() => applyQuickDiscount(p)}
                >
                  {p}%
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="percentInput">Discount %</Label>
              <div className="relative">
                <Percent className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                <Input
                  id="percentInput"
                  type="number"
                  tabIndex={-1}
                  placeholder="0"
                  className="[appearance:textfield] pl-9 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  {...register('percentInput')}
                  onChange={handlePercentChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salePrice" className="text-primary font-bold">
                Sale Price
              </Label>
              <div className="relative">
                <span className="text-primary absolute top-1/2 left-3 -translate-y-1/2 font-bold">
                  ₱
                </span>
                <Input
                  id="salePrice"
                  autoFocus
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className={cn(
                    'border-primary/40 bg-primary/5 focus-visible:ring-primary pl-8 font-bold',
                    '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                  )}
                  {...register('salePrice', {
                    min: { value: 0, message: 'Price cannot be negative' },
                    validate: (value) =>
                      !value ||
                      value < watchPrice ||
                      'Must be lower than base price',
                  })}
                />
                {discount > 0 && (
                  <span className="bg-primary absolute -top-2 -right-1 rounded-full px-1.5 py-0.5 text-xs font-bold text-white">
                    -{discount}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {errors.salePrice && (
            <p className="text-destructive text-center text-base font-medium tracking-tight uppercase">
              {errors.salePrice.message}
            </p>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sale_starts_at" className="text-muted-foreground">
                Starts At
                <span className="ml-1 text-xs">(optional)</span>
              </Label>
              <Input
                id="sale_starts_at"
                type="datetime-local"
                className="text-sm"
                {...register('sale_starts_at')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_ends_at" className="text-muted-foreground">
                Ends At
                <span className="ml-1 text-xs">(optional)</span>
              </Label>
              <Input
                id="sale_ends_at"
                type="datetime-local"
                className="text-sm"
                {...register('sale_ends_at', {
                  validate: (value) => {
                    const starts = watch('sale_starts_at');
                    if (!value || !starts) return true;
                    return (
                      value > starts || 'End date must be after start date'
                    );
                  },
                })}
              />
              {errors.sale_ends_at && (
                <p className="text-destructive text-xs">
                  {errors.sale_ends_at.message}
                </p>
              )}
            </div>
          </div>

          {serverError && (
            <p className="text-destructive text-center text-sm font-medium">
              {serverError}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending || isRemoving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isRemoving}
              className="min-w-30 gap-2"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Confirm Sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16);
}
