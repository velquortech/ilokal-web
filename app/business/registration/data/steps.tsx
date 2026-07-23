import { ShopCategoryStep } from '../steps/ShopCategoryStep';
import { ShopInformation } from '../steps/ShopInformation';
import { ShopGallery } from '../steps/Gallery';
import { ShopDocuments } from '../steps/Documents';
import { ShopReview } from '../steps/Review';

export interface RegistrationStep {
  title: string;
  description: string;
  component: React.ReactNode;
}

const CATEGORY_STEP: RegistrationStep = {
  title: 'Business Category',
  description: 'Select the category that best describes your business.',
  component: <ShopCategoryStep />,
};

const INFORMATION_STEP: RegistrationStep = {
  title: 'Shop Information',
  description: 'Provide basic details about your shop.',
  component: <ShopInformation />,
};

const GALLERY_STEP: RegistrationStep = {
  title: 'Gallery',
  description: 'Upload your logo and showcase images of your shop.',
  component: <ShopGallery />,
};

const DOCUMENTS_STEP: RegistrationStep = {
  title: 'Documents',
  description: 'Upload the required business documents for verification.',
  component: <ShopDocuments />,
};

const REVIEW_STEP: RegistrationStep = {
  title: 'Review & Submit',
  description:
    'Review all the information before submitting your registration.',
  component: <ShopReview />,
};

// The Documents step is gated by the admin-controlled
// require_business_documents flag (see .claude/REGISTRATION_GATING.md).
export function getSteps(requireDocuments: boolean): RegistrationStep[] {
  return requireDocuments
    ? [
        CATEGORY_STEP,
        INFORMATION_STEP,
        GALLERY_STEP,
        DOCUMENTS_STEP,
        REVIEW_STEP,
      ]
    : [CATEGORY_STEP, INFORMATION_STEP, GALLERY_STEP, REVIEW_STEP];
}
