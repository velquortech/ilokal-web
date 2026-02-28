'use client';

import { Control } from 'react-hook-form';
import { UserFormData } from '@/lib/schemas/userFormSchema';
import {
  FormFieldConfig,
  SelectFieldConfig,
} from '@/lib/types/forms';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormFieldsProps {
  control: Control<UserFormData>;
  fields: FormFieldConfig[];
  selectFields: Record<string, SelectFieldConfig>;
  shouldShowField: (field?: string[]) => boolean;
}

export function InputFormFields({
  control,
  fields,
  shouldShowField,
}: Omit<FormFieldsProps, 'selectFields'>) {
  return (
    <>
      {fields
        .filter(({ showFor }) => shouldShowField(showFor))
        .map(({ name, label, placeholder, type = 'text' }) => (
          <FormField
            key={name}
            control={control}
            name={name as keyof UserFormData}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={placeholder}
                    type={type}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
    </>
  );
}

export function SelectFormFields({
  control,
  selectFields,
  shouldShowField,
}: Omit<FormFieldsProps, 'fields'>) {
  return (
    <>
      {Object.values(selectFields)
        .filter(({ showFor }) => shouldShowField(showFor))
        .map(({ name, label, placeholder, options }) => (
          <FormField
            key={name}
            control={control}
            name={name as keyof UserFormData}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map(({ value, label: optLabel }) => (
                      <SelectItem key={value} value={value}>
                        {optLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
    </>
  );
}