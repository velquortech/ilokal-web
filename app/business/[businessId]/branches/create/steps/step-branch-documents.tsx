'use client';

import React from 'react';
import { Controller } from 'react-hook-form';
import { useBranchForm } from '../provider/branch-form-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Field, FieldError } from '@/components/ui/field';
import {
  AlertTriangleIcon,
  Dot,
  FileText,
  Layers,
  Upload,
  X,
  LucideIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MouseEvent, useRef } from 'react';
import type { BranchCreateValues } from '../validator/branch-create-schema';

export function StepBranchDocuments() {
  return (
    <div className="flex flex-1 flex-col gap-7">
      <Alert className="border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
        <AlertTriangleIcon />
        <AlertTitle>Branch Verification Documents</AlertTitle>
        <AlertDescription>
          Upload documents to verify your new branch location. Your application
          will be reviewed by our team within 24–48 hours.
        </AlertDescription>
      </Alert>

      <DocumentFileUpload
        label="Business Permit"
        fieldName="business_permit"
        icon={FileText}
      />
      <DocumentFileUpload
        label="Supporting Document (Optional)"
        fieldName="other_document"
        icon={Layers}
      />

      <div className="bg-muted/50 border-border mt-2 space-y-2 rounded-lg border p-5">
        <p className="text-foreground text-sm font-medium">
          Document Guidelines:
        </p>
        <ul className="text-foreground list-inside list-disc space-y-1 text-sm">
          <li>Documents must be clear and readable</li>
          <li>All information must be current and valid</li>
          <li>Accepted formats: PDF, Word, or image files (max 10 MB)</li>
          <li>Branch will be reviewed and activated within 24–48 hours</li>
        </ul>
      </div>
    </div>
  );
}

function DocumentFileUpload({
  label,
  fieldName,
  icon,
}: {
  label: string;
  fieldName: keyof Pick<
    BranchCreateValues,
    'business_permit' | 'other_document'
  >;
  icon: LucideIcon;
}) {
  const { form, cacheFile, clearFileCache } = useBranchForm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldFile = form.watch(fieldName) as File | undefined;

  return (
    <Controller
      name={fieldName}
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex w-full flex-col gap-2">
            <Label>{label}</Label>

            <div
              className="border-border hover:border-primary hover:bg-muted/50 inline-flex w-full cursor-pointer items-center rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="bg-primary/10 text-primary mr-5 rounded-sm p-2">
                {React.createElement(icon)}
              </div>

              {fieldFile ? (
                <>
                  <div className="flex flex-col text-start">
                    <span className="font-semibold">{fieldFile.name}</span>
                    <p className="text-muted-foreground inline-flex items-center gap-2">
                      {label}
                      <Dot />
                      {(fieldFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    size="icon"
                    className="ml-auto rounded-full"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      e.stopPropagation();
                      form.setValue(fieldName, undefined, {
                        shouldValidate: true,
                      });
                      clearFileCache(fieldName);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Select File</span>
                  </div>
                  <div className="ml-auto">
                    <Button type="button" variant="ghost">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                form.setValue(fieldName, file, { shouldValidate: true });
                cacheFile(fieldName, file);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}
