'use client';

import * as React from 'react';
import { Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductResponse } from '@/lib/types';

interface ProductPickerProps {
  products: ProductResponse[];
  value: string[];
  onChange: (ids: string[]) => void;
}

export function ProductPicker({
  products,
  value,
  onChange,
}: ProductPickerProps) {
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const selectedProducts = React.useMemo(
    () => products.filter((p) => value.includes(p.id)),
    [products, value],
  );

  const toggle = (id: string) => {
    const next = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value, id];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProducts.map((p) => (
            <span
              key={p.id}
              className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
            >
              {p.name}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== p.id))}
                className="hover:text-primary/60 ml-0.5"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="border-input bg-background placeholder:text-muted-foreground w-full rounded-md border py-1.5 pr-3 pl-8 text-sm outline-none focus-visible:ring-1"
        />
      </div>

      {/* Product list */}
      <div
        role="listbox"
        aria-multiselectable="true"
        aria-label="Select products"
        className="border-border max-h-48 overflow-y-auto rounded-md border"
      >
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {products.length === 0
              ? 'No products available'
              : 'No products match your search'}
          </p>
        ) : (
          filtered.map((product) => {
            const checked = value.includes(product.id);
            return (
              <div
                key={product.id}
                role="option"
                aria-selected={checked}
                tabIndex={0}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors select-none',
                  'hover:bg-muted/50 focus-visible:ring-1 focus-visible:outline-none focus-visible:ring-inset',
                  checked && 'bg-primary/5',
                )}
                onClick={() => toggle(product.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggle(product.id);
                  }
                }}
              >
                {/* Visual checkbox — pure CSS, no Radix button */}
                <div
                  className={cn(
                    'border-input flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                    checked && 'bg-primary border-primary',
                  )}
                >
                  {checked && <Check className="size-3 text-white" />}
                </div>

                <span className="flex-1 text-sm font-medium">
                  {product.name}
                </span>
                <span className="text-muted-foreground text-xs">
                  ₱{product.price.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>

      {selectedProducts.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {selectedProducts.length} product(s) selected
        </p>
      )}
    </div>
  );
}
