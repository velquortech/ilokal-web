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
import {
  type BusinessType,
  type RawBusinessType,
  transformBusinessTypes,
} from '../api/fetchCategories';

type Step = 1 | 2 | 3 | 4 | 5; // 5 = Review/Submit

type ContextType = {
  step: Step;
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

const stepFields: Record<Step, FieldPath<BusinessProps>[]> = {
  1: ['business_category'],
  2: [
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
  ],
  3: ['shop_logo', 'interior_images', 'shop_banner'],
  4: ['business_license', 'tax_certificate'],
  5: ['accepted_terms'], // Review step: terms + privacy acceptance
};

export function MultiStepFormProvider({
  children,
  rawBusinessTypes = [],
}: {
  children: React.ReactNode;
  rawBusinessTypes?: RawBusinessType[];
}) {
  const businessTypes = useMemo(
    () => transformBusinessTypes(rawBusinessTypes),
    [rawBusinessTypes],
  );

  const [step, setStep] = useState<Step>(1);
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

  // Restore step from cache on mount (synchronously before paint)
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const savedStep = localStorage.getItem('ilokal-registration-step');
    if (savedStep) {
      const stepNum = parseInt(savedStep, 10);
      if ([1, 2, 3, 4, 5].includes(stepNum)) {
        setStep(stepNum as Step);
      }
    }
  }, []);

  // Persist step to cache
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ilokal-registration-step', step.toString());
  }, [step]);

  // Validate current step and update canProceed
  useEffect(() => {
    if (!isHydrated) return;

    const subscription = form.watch(() => {
      form.trigger(stepFields[step]).then(setCanProceed);
    });

    // Initial validation after hydration or step change
    form.trigger(stepFields[step]).then(setCanProceed);

    return () => subscription.unsubscribe();
  }, [form, step, isHydrated]);

  const validateStep = async () => {
    const fields = stepFields[step];
    const result = await form.trigger(fields);
    setCanProceed(result);
    return result;
  };

  const nextStep = async () => {
    const valid = await validateStep();
    if (!valid) return;

    setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
    setCanProceed(false);
  };

  const prevStep = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
    setCanProceed(true);
  };

  return (
    <multiStepFormContext.Provider
      value={{
        step,
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
