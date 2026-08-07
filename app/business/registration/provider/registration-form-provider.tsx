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
  useOfferingImages,
  type OfferingImages,
} from '../hooks/useOfferingImages';
import { getSteps, type RegistrationStep } from '../data/steps';
import {
  findVerticalForCategoryId,
  type BusinessType,
  type RawBusinessType,
  transformBusinessTypes,
} from '../api/fetchCategories';
import { resolveOfferingVocabulary } from '@/lib/utils/offeringVocabulary';
import {
  offeringModeForVerticalName,
  type OfferingMode,
  type OfferingVocabulary,
} from '@/lib/types/offering';

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
  /**
   * The shop's own words for what it lists, resolved from the category chosen
   * in step 1.
   *
   * Every other surface reads this from a `businesses` row via
   * `useOfferingVocabulary()`. The wizard cannot: the row does not exist until
   * final submit. So the vertical is looked up from the picked shop type and
   * its `offering_profile` is fed to the same pure resolver, which degrades
   * per field to the retail default for a custom category, an unmapped
   * vertical, or a malformed profile.
   */
  vocabulary: OfferingVocabulary;
  /**
   * The `offering_mode` the business WILL be created with, mirrored from the
   * DB trigger. Drives `kind` on the offerings this wizard writes.
   */
  offeringMode: OfferingMode;
  /**
   * Photos for the wizard's offerings, keyed by each row's `uid`.
   *
   * Shared here because the menu step collects them and `performSubmission`
   * uploads them, and neither can reach the other.
   */
  offeringImages: OfferingImages;
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
const OFFERING_FIELDS: FieldPath<BusinessProps>[] = ['offerings'];
const DEAL_FIELDS: FieldPath<BusinessProps>[] = ['deal'];
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
        OFFERING_FIELDS,
        DEAL_FIELDS,
        REVIEW_FIELDS,
      ]
    : [
        CATEGORY_FIELDS,
        INFORMATION_FIELDS,
        GALLERY_FIELDS,
        OFFERING_FIELDS,
        DEAL_FIELDS,
        REVIEW_FIELDS,
      ];
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
      offerings: [],
      // null = skipped. The step is optional and must never gate Submit.
      deal: null,
      accepted_terms: false,
    },
  });

  const offeringImages = useOfferingImages();

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

  /**
   * The chosen shop type's vertical drives both the wording and the mode.
   *
   * Watched rather than read once: an owner can go back to step 1 and change
   * their category, and a menu step still saying "Menu" for a salon would be
   * the exact defect `useOfferingVocabulary()` exists to prevent elsewhere.
   */
  const selectedCategoryId = form.watch('business_category.id');
  const selectedVertical = useMemo(
    () => findVerticalForCategoryId(businessTypes, selectedCategoryId),
    [businessTypes, selectedCategoryId],
  );
  const offeringMode = useMemo(
    () => offeringModeForVerticalName(selectedVertical?.name),
    [selectedVertical],
  );
  const vocabulary = useMemo(
    () =>
      resolveOfferingVocabulary(
        selectedVertical?.offeringProfile ?? null,
        offeringMode,
      ),
    [selectedVertical, offeringMode],
  );

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
        vocabulary,
        offeringMode,
        offeringImages,
      }}
    >
      {children}
    </multiStepFormContext.Provider>
  );
}
