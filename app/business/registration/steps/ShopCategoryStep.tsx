import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Check, List, LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useMultiStepForm } from '../provider/registration-form-provider';

import { Field, FieldError } from '@/components/ui/field';
import { Controller } from 'react-hook-form';

export function ShopCategoryStep() {
  const { form, businessTypes } = useMultiStepForm();
  const [selected, setSelected] = useState<string>();
  const category = form.watch('business_category');

  const items =
    selected !== 'All' && selected !== undefined
      ? businessTypes?.find((b) => b.name === selected)?.items
      : businessTypes.reduce(
          (b, t) => [...b, ...t.items],
          [] as (typeof businessTypes)[number]['items'],
        );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* BUSINESS TYPE FILTER — heads the list; each option is a type, and the
          grid below shows that type's categories. Deliberately no "Custom"
          option: an owner-invented type has no vertical, so it falls back to
          the retail offering mode and breaks the type-scoped sorting and
          category scoping everywhere downstream. */}
      <Select
        onValueChange={(value) => {
          setSelected(value);

          // Picking a filter never picks a category — it resets the selection
          // so the owner chooses from the filtered grid.
          form.setValue(
            'business_category',
            {
              type: 'predefined',
              name: '',
              description: '',
            },
            { shouldValidate: true },
          );
        }}
        defaultValue="All"
      >
        <SelectTrigger className="flex h-16! w-full items-center truncate overflow-hidden text-start ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <SelectValue placeholder="Select business type" />
        </SelectTrigger>

        <SelectContent position="popper">
          <SelectGroup className="space-y-2">
            <SelectLabel>Business Type</SelectLabel>

            <SelectItem value="All">
              <div className="bg-primary/10 text-primary! rounded p-2.5">
                <List />
              </div>
              <div className="ml-4 flex flex-col">
                <p className="font-medium">All Business Types</p>
                <p className="text-muted-foreground/50 min-w-0 flex-1 truncate overflow-hidden text-sm">
                  Show every business type's categories
                </p>
              </div>
            </SelectItem>

            {businessTypes.map((b) => (
              <SelectItem value={b.name} key={b.name}>
                <div className="bg-primary/10 text-primary! rounded p-2.5">
                  <b.icon />
                </div>
                <div className="ml-4 flex flex-col">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-muted-foreground/50 min-w-0 flex-1 truncate overflow-hidden text-sm">
                    {b.description}
                  </p>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* CATEGORY GRID — the categories of the type selected above */}
      <Controller
        name="business_category"
        control={form.control}
        render={({ fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="mt-4 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items?.map((item, idx) => {
                  const isSelected =
                    category?.type === 'predefined' &&
                    category.name === item.name;

                  return (
                    <CategoryCard
                      {...item}
                      key={idx}
                      isSelected={isSelected}
                      hasSelected={
                        category?.type === 'predefined' && !!category?.name
                      }
                      onSelect={() => {
                        form.setValue(
                          'business_category',
                          {
                            id: isSelected ? undefined : item.id,
                            type: 'predefined',
                            name: isSelected ? '' : item.name,
                            description: item.description,
                          },
                          { shouldValidate: true },
                        );
                      }}
                      type={businessTypes.find((x) =>
                        x.items.find((t) => t.name === item.name),
                      )}
                    />
                  );
                })}
              </div>
            </div>

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  );
}

function CategoryCard(item: {
  name: string;
  imageURL: string;
  description: string;
  isSelected?: boolean;
  onSelect: () => void;
  hasSelected?: boolean;
  type?: {
    name: string;
    icon: LucideIcon;
  };
}) {
  return (
    <div
      className={cn(
        'border-border hover:border-primary group relative h-max cursor-pointer overflow-hidden rounded-lg border p-1 shadow',
        item.isSelected && 'border-primary',
      )}
      onClick={item.onSelect}
    >
      {item.isSelected && (
        <div
          className={cn(
            'ring-primary absolute top-3 right-3 z-20 flex size-4 rounded-full bg-white ring-3',
          )}
        >
          <Check className="text-primary m-auto size-3" />
        </div>
      )}
      <div className="bg-muted border-border z-10 h-36 w-full overflow-hidden rounded-md border sm:h-52">
        <Image
          alt={item.name}
          src={item.imageURL}
          width={1000}
          height={1000}
          className={cn(
            'transition-all duration-300 group-hover:scale-110',
            !item.isSelected &&
              item.hasSelected &&
              'grayscale hover:grayscale-0',
          )}
        />
      </div>
      <div className="mt-2 h-20 p-2 pb-0">
        <p className="text-foreground font-medium">{item.name}</p>
        <p className="text-muted-foreground mt-1 text-xs">{item.description}</p>
      </div>
      {item.type && (
        <div className="text-muted-foreground/50 inline-flex items-center gap-2 p-2 pt-0">
          <item.type.icon className="size-3" />
          <span className="text-xs">{item.type.name}</span>
        </div>
      )}
    </div>
  );
}
