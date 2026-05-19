'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { BadgePercent, Check, Loader2, Percent } from 'lucide-react';
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
import { calculatePercentage } from '@/lib/product-helper';
import { Product } from '../../libs/types/product.type';

interface ApplySaleProps {
  product: Product;
  children: React.ReactNode;
}

const QUICK_DISCOUNTS = [10, 25, 50, 70];

export function ApplySale({ product, children }: ApplySaleProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      price: product.price,
      salePrice: product.salePrice || undefined,
      percentInput: '',
    },
  });

  const watchPrice = watch('price');
  const watchSalePrice = watch('salePrice');

  // Logic to sync Percent Input -> Sale Price
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

  // Logic for Quick Template Buttons
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

  const onSubmit = async (data: { salePrice?: number }) => {
    setIsPending(true);
    try {
      // Your update logic here
      console.info(data);
      setOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          {/* Base Price - tabIndex={-1} ensures focus skips this */}
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

          {/* Quick Percent Templates */}
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
            {/* Custom Percent Input */}
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

            {/* Sale Price - This will be the first focusable element */}
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

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
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
