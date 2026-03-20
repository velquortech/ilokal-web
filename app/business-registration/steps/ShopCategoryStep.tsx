import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Coffee,
  Store,
  Scissors,
  Plane,
  Settings,
  Check,
  List,
  LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useMultiStepForm } from '../provider/registration-form-provider';

import { Field, FieldError } from '@/components/ui/field';
import { Controller } from 'react-hook-form';

export const businessTypes = [
  {
    name: 'Food & Beverage',
    description:
      'Businesses that serve food and drinks, ranging from cafés and restaurants to bakeries and street vendors.',
    icon: Coffee,
    items: [
      {
        name: 'Café',
        description: 'A casual spot serving coffee, tea, and light meals.',
        imageURL:
          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Restaurant',
        description:
          'Full-service dining establishments offering meals and beverages.',
        imageURL:
          'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Bar / Pub',
        description: 'Social venues serving alcoholic drinks and light snacks.',
        imageURL:
          'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Bakery / Pastry Shop',
        description: 'Shops specializing in bread, cakes, and pastries.',
        imageURL:
          'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Street Food Vendor',
        description:
          'Small stalls or carts offering quick, affordable local food.',
        imageURL:
          'https://images.unsplash.com/photo-1664612702379-94f5b5030803?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
    ],
  },
  {
    name: 'Retail',
    description:
      'Shops that sell goods directly to customers, including groceries, specialty stores, clothing, and books.',
    icon: Store,
    items: [
      {
        name: 'Local Grocery / Convenience Store',
        description:
          'Neighborhood stores selling daily essentials and fresh produce.',
        imageURL:
          'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Specialty Shop',
        description: 'Stores offering unique crafts, souvenirs, or delicacies.',
        imageURL:
          'https://images.unsplash.com/photo-1628602592413-cdb2aaf0a353?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Clothing & Apparel',
        description: 'Fashion boutiques and apparel shops for everyday wear.',
        imageURL:
          'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Bookstore / Stationery',
        description: 'Shops selling books, magazines, and writing supplies.',
        imageURL:
          'https://images.unsplash.com/photo-1512820790803-83ca734da794',
      },
    ],
  },
  {
    name: 'Services',
    description:
      'Service-oriented businesses offering personal care, wellness, fitness, or repair solutions.',
    icon: Scissors,
    items: [
      {
        name: 'Salon / Barbershop',
        description: 'Hair and grooming services for men and women.',
        imageURL:
          'https://images.unsplash.com/photo-1629397685944-7073f5589754?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Spa / Wellness Center',
        description:
          'Facilities offering relaxation, massage, and wellness treatments.',
        imageURL:
          'https://images.unsplash.com/photo-1600334129128-685c5582fd35?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Fitness Studio / Gym',
        description:
          'Spaces for exercise, training, and group fitness classes.',
        imageURL:
          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Repair Services',
        description:
          'Shops providing repair for electronics, tailoring, and more.',
        imageURL:
          'https://images.unsplash.com/photo-1563770660941-20978e870e26?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
    ],
  },
  {
    name: 'Tourism & Leisure',
    description:
      'Businesses that cater to tourists and leisure activities, such as accommodations, tours, cultural experiences, and entertainment venues.',
    icon: Plane,
    items: [
      {
        name: 'Bed & Breakfast / Guesthouse',
        description:
          'Small lodging establishments offering overnight stays and breakfast.',
        imageURL:
          'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Cultural Experience Provider',
        description:
          'Workshops or classes showcasing local traditions and skills.',
        imageURL:
          'https://images.unsplash.com/photo-1560831340-b9679dc9e9f0?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Entertainment Venue',
        description:
          'Spaces for live music, karaoke, theater, and social events.',
        imageURL:
          'https://images.unsplash.com/photo-1766532721742-186e96e3db3a?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
    ],
  },
];

export function ShopCategoryStep() {
  const { form } = useMultiStepForm();

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
      {/* SELECT (unchanged UI, just wired) */}
      <Select
        onValueChange={(value) => {
          setSelected(value);

          // reset form value depending on mode
          if (value === 'Custom') {
            form.setValue(
              'business_category',
              {
                type: 'custom',
                name: '',
                description: '',
              },
              { shouldValidate: true },
            );
          } else {
            form.setValue(
              'business_category',
              {
                type: 'predefined',
                name: '',
                description: '',
              },
              { shouldValidate: true },
            );
          }
        }}
        defaultValue="All"
      >
        <SelectTrigger className="flex h-16! w-full items-center truncate overflow-hidden text-start ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <SelectValue placeholder="Filter by business type" />
        </SelectTrigger>

        <SelectContent position="popper">
          <SelectGroup className="space-y-2">
            <SelectItem value="All">
              <div className="bg-primary/10 text-primary! rounded p-2.5">
                <List />
              </div>
              <div className="ml-4 flex flex-col">
                <p className="font-medium">All Business Categories</p>
                <p className="text-muted-foreground/50 min-w-0 flex-1 truncate overflow-hidden text-sm">
                  Show all available business categories
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

            <SelectItem value="Custom">
              <div className="bg-primary/10 text-primary! rounded p-2.5">
                <Settings />
              </div>
              <div className="ml-4 flex flex-col">
                <p className="font-medium">Custom</p>
                <p className="text-muted-foreground/50 min-w-0 flex-1 truncate overflow-hidden text-sm">
                  Create custom category
                </p>
              </div>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* MAIN FIELD */}
      <Controller
        name="business_category"
        control={form.control}
        render={({ fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            {/* PREDEFINED */}
            {selected !== 'Custom' ? (
              <div className="mt-4 text-sm">
                <div className="grid grid-cols-3 gap-4">
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
            ) : (
              /* CUSTOM */
              <Card className="mt-10 max-h-96">
                <CardHeader>
                  <CardTitle>Create Custom Category</CardTitle>
                  <CardDescription>
                    Please fillout the form to continue
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2">
                  {/* NAME */}
                  <Controller
                    name="business_category.name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Label>Category Name</Label>
                        <Input
                          {...field}
                          placeholder="Enter name..."
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  {/* DESCRIPTION */}
                  <Controller
                    name="business_category.description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Label className="mt-4">Description</Label>
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder="Enter description..."
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* ERROR (predefined mode) */}
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
      <div className="bg-muted border-border z-10 h-52 w-full overflow-hidden rounded-md border">
        <Image
          alt={item.name}
          src={item.imageURL}
          width={1000}
          height={1000}
          className={cn(
            'transition-all duration-500 group-hover:scale-110',
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
