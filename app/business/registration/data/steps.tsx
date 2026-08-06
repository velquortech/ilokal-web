import { ShopCategoryStep } from '../steps/ShopCategoryStep';
import { ShopInformation } from '../steps/ShopInformation';
import { ShopGallery } from '../steps/Gallery';
import { ShopDocuments } from '../steps/Documents';
import { ShopOfferings } from '../steps/Offerings';
import { ShopReview } from '../steps/Review';
import {
  REGISTRATION_STEP_META,
  getRegistrationStepIds,
  type RegistrationStepId,
} from './stepMeta';

export interface RegistrationStep {
  title: string;
  description: string;
  component: React.ReactNode;
}

/**
 * The wizard = the step METADATA plus a component per step.
 *
 * Titles and descriptions live in `stepMeta.ts`, which carries no JSX, so the
 * public `/for-business` page can name the same steps without pulling this
 * form into its bundle — and so the two can never disagree about what the flow
 * is. A `Record` over the id union means a new step is a compile error here
 * until it has a component.
 */
const STEP_COMPONENTS: Record<RegistrationStepId, React.ReactNode> = {
  category: <ShopCategoryStep />,
  information: <ShopInformation />,
  gallery: <ShopGallery />,
  documents: <ShopDocuments />,
  offerings: <ShopOfferings />,
  review: <ShopReview />,
};

// The Documents step is gated by the admin-controlled
// require_business_documents flag (see .claude/REGISTRATION_GATING.md).
export function getSteps(requireDocuments: boolean): RegistrationStep[] {
  return getRegistrationStepIds(requireDocuments).map((id) => ({
    title: REGISTRATION_STEP_META[id].title,
    description: REGISTRATION_STEP_META[id].description,
    component: STEP_COMPONENTS[id],
  }));
}
