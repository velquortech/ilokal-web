'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { FieldPath, useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BusinessProps,
  fullSchema,
} from '../validator/business-registration-form-schema';
import { useFormCache } from '../hooks/useFormCache';
import { getSteps, type RegistrationStep } from '../data/steps';
import {
  type BusinessType,
  type RawBusinessType,
  transformBusinessTypes,
} from '../api/fetchCategories';

type ContextType = {
  step: number; // 1-based index into `steps`
  steps: RegistrationStep[];
  requireDocuments: boolean;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  canProceed: boolean;
  form: UseFormReturn<BusinessProps>;
  clearFormCache: () => void;
  cacheFile: (fieldName: string, file: File) => Promise<void>;
  cacheFiles: (fieldName: string, files: File[]) => Promise<void>;
  clearFileCache: (fieldName: string) => void;
  businessTypes: BusinessType[];
};

const multiStepFormContext = createContext<ContextType | null>(null);

export const useMultiStepForm = () => {
  const ctx = useContext(multiStepFormContext);
  if (!ctx) throw new Error('Must be used inside provider');
  return ctx;
};

const CATEGORY_FIELDS: FieldPath<BusinessProps>[] = ['business_category'];
const INFORMATION_FIELDS: FieldPath<BusinessProps>[] = [
  'shop_name',
  'description',
  'location.province',
  'location.city',
  'location.barangay',
  'location.street_address',
  'location.zip_code',
  'location.latitude',
  'location.longitude',
  'location.geometry',
];
const GALLERY_FIELDS: FieldPath<BusinessProps>[] = [
  'shop_logo',
  'interior_images',
  'shop_banner',
];
const DOCUMENT_FIELDS: FieldPath<BusinessProps>[] = [
  'business_license',
  'tax_certificate',
];
const REVIEW_FIELDS: FieldPath<BusinessProps>[] = ['accepted_terms'];

// Mirrors getSteps(): one field group per step, Documents gated by the flag.
export function getStepFieldGroups(
  requireDocuments: boolean,
): FieldPath<BusinessProps>[][] {
  return requireDocuments
    ? [
        CATEGORY_FIELDS,
        INFORMATION_FIELDS,
        GALLERY_FIELDS,
        DOCUMENT_FIELDS,
        REVIEW_FIELDS,
      ]
    : [CATEGORY_FIELDS, INFORMATION_FIELDS, GALLERY_FIELDS, REVIEW_FIELDS];
}

export function MultiStepFormProvider({
  children,
  rawBusinessTypes = [],
  requireDocuments = true,
}: {
  children: React.ReactNode;
  rawBusinessTypes?: RawBusinessType[];
  requireDocuments?: boolean;
}) {
  const businessTypes = useMemo(
    () => transformBusinessTypes(rawBusinessTypes),
    [rawBusinessTypes],
  );
  const steps = useMemo(() => getSteps(requireDocuments), [requireDocuments]);
  const stepFieldGroups = useMemo(
    () => getStepFieldGroups(requireDocuments),
    [requireDocuments],
  );

  const [step, setStep] = useState(1);
  const [canProceed, setCanProceed] = useState(false);

  const form = useForm<BusinessProps>({
    mode: 'onChange',
    resolver: zodResolver(fullSchema),
    defaultValues: {
      business_category: {
        type: 'predefined',
        name: '',
        description: '',
      },
      shop_name: '',
      description: '',
      location: {
        province: '',
        city: '',
        barangay: '',
        street_address: '',
        zip_code: '',
        latitude: undefined,
        longitude: undefined,
        geometry: '',
      },
      shop_logo: undefined,
      shop_banner: undefined,
      interior_images: [],
      business_license: undefined,
      tax_certificate: undefined,
      accepted_terms: false,
    },
  });

  const {
    clearCache: clearFormCache,
    cacheFile,
    cacheFiles,
    clearFileCache,
    isHydrated,
  } = useFormCache(form);

  // Restore step from cache on mount (synchronously before paint). Clamp to
  // the current step count — a cached step 5 from the docs-required flow must
  // not overshoot when the flag turns documents off (4 steps).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const savedStep = localStorage.getItem('ilokal-registration-step');
    if (savedStep) {
      const stepNum = parseInt(savedStep, 10);
      if (Number.isInteger(stepNum) && stepNum >= 1) {
        setStep(Math.min(stepNum, steps.length));
      }
    }
  }, [steps.length]);

  // Persist step to cache
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ilokal-registration-step', step.toString());
  }, [step]);

  // Validate current step and update canProceed
  useEffect(() => {
    if (!isHydrated) return;

    const fields = stepFieldGroups[step - 1] ?? [];

    const subscription = form.watch(() => {
      form.trigger(fields).then(setCanProceed);
    });

    // Initial validation after hydration or step change
    form.trigger(fields).then(setCanProceed);

    return () => subscription.unsubscribe();
  }, [form, step, stepFieldGroups, isHydrated]);

  const validateStep = async () => {
    const fields = stepFieldGroups[step - 1] ?? [];
    const result = await form.trigger(fields);
    setCanProceed(result);
    return result;
  };

  const nextStep = async () => {
    const valid = await validateStep();
    if (!valid) return;

    setStep((prev) => (prev < steps.length ? prev + 1 : prev));
    setCanProceed(false);
  };

  const prevStep = () => {
    setStep((prev) => (prev > 1 ? prev - 1 : prev));
    setCanProceed(true);
  };

  return (
    <multiStepFormContext.Provider
      value={{
        step,
        steps,
        requireDocuments,
        nextStep,
        prevStep,
        canProceed,
        form,
        clearFormCache,
        cacheFile,
        cacheFiles,
        clearFileCache,
        businessTypes,
      }}
    >
      {children}
    </multiStepFormContext.Provider>
  );
}
