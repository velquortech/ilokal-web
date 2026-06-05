'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';
import { FieldPath, useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BranchCreateValues,
  branchCreateFullSchema,
} from '../validator/branch-create-schema';

type Step = 1 | 2 | 3 | 4 | 5;

type FileCacheKey =
  | 'business_permit'
  | 'other_document'
  | 'cover_image'
  | 'gallery_images';

type BranchFormContextType = {
  step: Step;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  canProceed: boolean;
  form: UseFormReturn<BranchCreateValues>;
  cacheFile: (field: FileCacheKey, file: File) => void;
  cacheFiles: (field: 'gallery_images', files: File[]) => void;
  clearFileCache: (field: FileCacheKey) => void;
};

const BranchFormContext = createContext<BranchFormContextType | null>(null);

export const useBranchForm = () => {
  const ctx = useContext(BranchFormContext);
  if (!ctx) throw new Error('Must be used inside BranchFormProvider');
  return ctx;
};

const stepFields: Record<Step, FieldPath<BranchCreateValues>[]> = {
  1: ['name', 'phone', 'email', 'description'],
  2: ['address'],
  3: [], // Images — optional, always can proceed
  4: [], // Documents — optional
  5: [], // Review — always can proceed
};

export function BranchFormProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [step, setStep] = useState<Step>(1);
  const [canProceed, setCanProceed] = useState(false);
  const fileCache = useRef<Partial<Record<FileCacheKey, File | File[]>>>({});

  const form = useForm<BranchCreateValues>({
    mode: 'onChange',
    resolver: zodResolver(branchCreateFullSchema),
    defaultValues: {
      name: '',
      address: '',
      latitude: undefined,
      longitude: undefined,
      phone: '',
      email: '',
      description: '',
      cover_image: undefined,
      gallery_images: [],
      business_permit: undefined,
      other_document: undefined,
    },
  });

  useEffect(() => {
    const fields = stepFields[step];
    if (fields.length === 0) {
      setCanProceed(true);
      return;
    }
    const subscription = form.watch(() => {
      form.trigger(fields).then(setCanProceed);
    });
    form.trigger(fields).then(setCanProceed);
    return () => subscription.unsubscribe();
  }, [form, step]);

  const nextStep = async () => {
    const fields = stepFields[step];
    if (fields.length > 0) {
      const valid = await form.trigger(fields);
      setCanProceed(valid);
      if (!valid) return;
    }
    setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
    setCanProceed(false);
  };

  const prevStep = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
    setCanProceed(true);
  };

  const cacheFile = (field: FileCacheKey, file: File) => {
    fileCache.current[field] = file;
  };

  const cacheFiles = (field: 'gallery_images', files: File[]) => {
    fileCache.current[field] = files;
  };

  const clearFileCache = (field: FileCacheKey) => {
    delete fileCache.current[field];
  };

  return (
    <BranchFormContext.Provider
      value={{
        step,
        nextStep,
        prevStep,
        canProceed,
        form,
        cacheFile,
        cacheFiles,
        clearFileCache,
      }}
    >
      {children}
    </BranchFormContext.Provider>
  );
}
