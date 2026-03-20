// MultiStepFormContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FieldPath, useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FormData,
  fullSchema,
} from '../validator/business-registration-form-schema';

type Step = 1 | 2 | 3 | 4;

type ContextType = {
  step: Step;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  canProceed: boolean;
  form: UseFormReturn<FormData>;
};

const multiStepFormContext = createContext<ContextType | null>(null);

export const useMultiStepForm = () => {
  const ctx = useContext(multiStepFormContext);
  if (!ctx) throw new Error('Must be used inside provider');
  return ctx;
};

const stepFields: Record<Step, FieldPath<FormData>[]> = {
  1: ['business_category'],
  2: [
    'shop_name',
    'description',
    'location.province',
    'location.city',
    'location.barangay',
    'location.street_address',
    'location.zip_code',
    'location.geometry',
  ],
  3: ['shop_logo', 'interior_images'],
  4: ['business_license', 'tax_certificate'],
};

export function MultiStepFormProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [step, setStep] = useState<Step>(1);
  const [canProceed, setCanProceed] = useState(false);

  const form = useForm<FormData>({
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
        geometry: 'lat:10.73,lng:122.55',
      },
      shop_logo: undefined,
      interior_images: [],
      business_license: undefined,
      tax_certificate: undefined,
    },
  });

  // 🔥 AUTO UPDATE canProceed
  useEffect(() => {
    const subscription = form.watch(async () => {
      const fields = stepFields[step];

      const isValid = await form.trigger(fields);
      setCanProceed(isValid);
    });

    return () => subscription.unsubscribe();
  }, [form, step]);

  const validateStep = async () => {
    const fields = stepFields[step];

    const result = await form.trigger(fields); // RHF typing limitation
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
      value={{ step, nextStep, prevStep, canProceed, form }}
    >
      {children}
    </multiStepFormContext.Provider>
  );
}
