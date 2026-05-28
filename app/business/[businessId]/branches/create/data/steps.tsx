import { StepBranchInfo } from '../steps/step-branch-info';
import { StepBranchLocation } from '../steps/step-branch-location';
import { StepBranchImages } from '../steps/step-branch-images';
import { StepBranchDocuments } from '../steps/step-branch-documents';
import { StepBranchReview } from '../steps/step-branch-review';

export const BRANCH_STEPS = [
  {
    title: 'Branch Info',
    description: 'Name, contact details, and description.',
    component: <StepBranchInfo />,
  },
  {
    title: 'Location',
    description: 'Add an address and optional map coordinates.',
    component: <StepBranchLocation />,
  },
  {
    title: 'Photos',
    description: 'Upload a cover photo and gallery images.',
    component: <StepBranchImages />,
  },
  {
    title: 'Documents',
    description: 'Upload your branch verification documents.',
    component: <StepBranchDocuments />,
  },
  {
    title: 'Review',
    description: 'Confirm details before submitting.',
    component: <StepBranchReview />,
  },
];
