'use client';

import { Controller } from 'react-hook-form';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Field, FieldError } from '@/components/ui/field';
import {
  Dot,
  FileText,
  Upload,
  X,
  AlertTriangleIcon,
  LucideIcon,
  HandCoins,
} from 'lucide-react';
import { MouseEvent, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MAX_FILE_SIZE } from '../validator/business-registration-form-schema';

export function ShopDocuments() {
  return (
    <div className="flex flex-1 flex-col gap-7">
      <Alert className="border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
        <AlertTriangleIcon />
        <AlertTitle>Required Documents</AlertTitle>
        <AlertDescription>
          These documents are required to verify your business. All information
          will be kept confidential and secure
        </AlertDescription>
      </Alert>

      <DocumentFileUpload
        name="Business License"
        fieldName="business_license"
        icon={FileText}
      />
      <DocumentFileUpload
        name="Tax Certification"
        fieldName="tax_certificate"
        icon={HandCoins}
      />

      <div className="bg-muted/50 border-border mt-5 space-y-2 rounded-lg border p-5">
        <p className="text-foreground text-sm font-medium">
          Document Guidelines:
        </p>
        <ul className="text-foreground list-inside list-disc space-y-1 text-sm">
          <li>Documents must be clear and readable</li>
          <li>All information must be current and valid</li>
          <li>Scanned copies or photos are acceptable</li>
          <li>Documents will be verified within 24-48 hours</li>
        </ul>
      </div>
    </div>
  );
}

function DocumentFileUpload(props: {
  name: string;
  fieldName: 'business_license' | 'tax_certificate';
  icon: LucideIcon;
}) {
  const { form, cacheFile, clearFileCache } = useMultiStepForm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldFile = form.watch(props.fieldName);

  return (
    <Controller
      name={props.fieldName}
      control={form.control}
      render={({ fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex w-full flex-col gap-2">
            <Label>{props.name}</Label>

            <div
              className="border-border hover:border-primary hover:bg-muted/50 inline-flex w-full cursor-pointer items-center rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="bg-primary/10 text-primary mr-5 rounded-sm p-2">
                <props.icon />
              </div>

              {fieldFile ? (
                <>
                  <div className="flex flex-col text-start">
                    <span className="font-semibold">{fieldFile.name}</span>
                    <p className="text-muted-foreground inline-flex items-center gap-2">
                      {props.name}
                      <span>
                        <Dot />
                      </span>
                      {(fieldFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    size="icon"
                    className="ml-auto rounded-full"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.preventDefault();
                      event.stopPropagation();

                      form.setValue(props.fieldName, undefined, {
                        shouldValidate: true,
                      });

                      // Clear file cache
                      clearFileCache(props.fieldName);

                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
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
                  <div className="ml-auto flex flex-col items-center gap-4">
                    <Button type="button" variant="ghost">
                      <Upload className="mr-2 h-4 w-4" />
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

                if (file.size > MAX_FILE_SIZE) {
                  form.setError(props.fieldName, {
                    type: 'manual',
                    message: 'File must be 2MB or less',
                  });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  return;
                }

                form.setValue(props.fieldName, file, { shouldValidate: true });

                // Cache the file
                cacheFile(props.fieldName, file);

                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            />

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        </Field>
      )}
    />
  );
}
