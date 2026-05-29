'use client';

import { Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Field, FieldError } from '@/components/ui/field';
import { useBranchForm } from '../provider/branch-form-provider';

export function StepBranchInfo() {
  const { form } = useBranchForm();

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <h2 className="font-semibold">Branch Information</h2>

      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="space-y-2">
              <Label htmlFor="branchName">Branch Name</Label>
              <Input
                id="branchName"
                placeholder="e.g. Main Branch, North Branch"
                {...field}
                aria-invalid={fieldState.invalid}
              />
              <p className="text-muted-foreground text-xs">
                This name will be visible to customers nearby.
              </p>
            </div>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="description"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="space-y-2">
              <Label htmlFor="branchDescription">Description (Optional)</Label>
              <Textarea
                id="branchDescription"
                placeholder="Brief description of this branch location"
                className="resize-none"
                rows={3}
                {...field}
              />
            </div>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="space-y-2">
                <Label htmlFor="branchPhone">Phone (Optional)</Label>
                <Input
                  id="branchPhone"
                  type="tel"
                  placeholder="e.g. 0917 123 4567"
                  {...field}
                />
              </div>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="space-y-2">
                <Label htmlFor="branchEmail">Email (Optional)</Label>
                <Input
                  id="branchEmail"
                  type="email"
                  placeholder="branch@example.com"
                  {...field}
                />
              </div>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </div>
  );
}
