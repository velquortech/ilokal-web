import { ShopCategoryStep } from '../steps/ShopCategoryStep';
import { ShopInformation } from '../steps/ShopInformation';
import { ShopGallery } from '../steps/Gallery';
import { ShopDocuments } from '../steps/Documents';
import { ShopReview } from '../steps/Review';

export const STEPS = [
  {
    title: 'Business Category',
    description: 'Select the category that best describes your business.',
    component: <ShopCategoryStep />,
  },
  {
    title: 'Shop Information',
    description: 'Provide basic details about your shop.',
    component: <ShopInformation />,
  },
  {
    title: 'Gallery',
    description: 'Upload your logo and showcase images of your shop.',
    component: <ShopGallery />,
  },
  {
    title: 'Documents',
    description: 'Upload the required business documents for verification.',
    component: <ShopDocuments />,
  },
  {
    title: 'Review & Submit',
    description:
      'Review all the information before submitting your registration.',
    component: <ShopReview />,
  },
];
