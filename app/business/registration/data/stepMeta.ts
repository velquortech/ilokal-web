/**
 * The registration wizard's steps, as DATA.
 *
 * Split out from `steps.tsx` because that file carries the step COMPONENTS —
 * the whole client-side form. The public `/for-business` page needs to name the
 * steps without dragging the wizard into its bundle, and two hand-maintained
 * lists of the same four steps is exactly how a marketing page ends up
 * describing a flow the product no longer has.
 *
 * So this is the single source: `steps.tsx` builds its components around these
 * titles, and the public page reads them directly.
 */

export type RegistrationStepId =
  | 'category'
  | 'information'
  | 'gallery'
  | 'documents'
  | 'offerings'
  | 'deal'
  | 'review';

export interface RegistrationStepMeta {
  id: RegistrationStepId;
  title: string;
  description: string;
}

export const REGISTRATION_STEP_META: Record<
  RegistrationStepId,
  RegistrationStepMeta
> = {
  category: {
    id: 'category',
    title: 'Business Category',
    description: 'Select the category that best describes your business.',
  },
  information: {
    id: 'information',
    title: 'Shop Information',
    description: 'Provide basic details about your shop.',
  },
  gallery: {
    id: 'gallery',
    title: 'Gallery',
    description: 'Upload your logo and showcase images of your shop.',
  },
  documents: {
    id: 'documents',
    title: 'Documents',
    description: 'Upload the required business documents for verification.',
  },
  offerings: {
    id: 'offerings',
    // Deliberately generic. This copy is also read by the PUBLIC
    // /for-business page, where the reader has not picked a vertical yet, so
    // it cannot say "menu" — a salon does not have one. Inside the wizard the
    // step itself uses the shop's own noun, resolved from the chosen category.
    title: 'What You Offer',
    description:
      'Add at least one item so your shop page is not empty on day one.',
  },
  deal: {
    id: 'deal',
    title: 'A Launch Deal',
    description:
      'Optional. Give shoppers a reason to walk in — you can skip this.',
  },
  review: {
    id: 'review',
    title: 'Review & Submit',
    description:
      'Review all the information before submitting your registration.',
  },
};

/**
 * The steps in order, for a given documents policy.
 *
 * The Documents step is gated by the admin-controlled
 * `require_business_documents` flag — off for the MVP, which is why a shop can
 * register today without uploading a permit. Anything that lists the steps must
 * come through here rather than hardcoding a count, or it starts lying the day
 * an admin flips the switch.
 */
export function getRegistrationStepIds(
  requireDocuments: boolean,
): RegistrationStepId[] {
  return requireDocuments
    ? [
        'category',
        'information',
        'gallery',
        'documents',
        'offerings',
        'deal',
        'review',
      ]
    : ['category', 'information', 'gallery', 'offerings', 'deal', 'review'];
}

export function getRegistrationStepMeta(
  requireDocuments: boolean,
): RegistrationStepMeta[] {
  return getRegistrationStepIds(requireDocuments).map(
    (id) => REGISTRATION_STEP_META[id],
  );
}
