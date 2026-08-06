import type { RegistrationStepId } from '@/app/business/registration/data/stepMeta';

/**
 * What each wizard step actually asks for.
 *
 * The point of the page: not "tell us about your shop" but the real fields, so
 * nobody starts the form and discovers the four-photo minimum at step three.
 *
 * A `Record` over the step union, so adding a step to the wizard is a compile
 * error here until someone writes down what it asks. The titles themselves come
 * from `stepMeta.ts` — this file only adds the detail a form cannot show until
 * you are already inside it.
 */
export const STEP_FIELDS: Record<RegistrationStepId, string[]> = {
  category: ['Business type', 'Category'],
  information: [
    'Shop name',
    'Description',
    'Branch address',
    'Map pin',
    'Contact number',
  ],
  gallery: ['Logo', 'Banner', 'Photos of the shop (4 or more)'],
  documents: ['Business permit', 'Tax certificate'],
  // Named in the generic, because the reader has not picked a vertical yet —
  // a salon has no "menu". Inside the wizard the step uses the shop's own noun.
  offerings: ['One item to start (name and price)'],
  review: ['Everything above, one last look'],
};

/**
 * The prerequisites, written as the constraints the form actually enforces.
 *
 * Every number here is real: `MAX_FILE_SIZE` is 2 MB and `step3Schema` requires
 * at least four interior images
 * (`app/business/registration/validator/business-registration-form-schema.ts`).
 * A pin is not decoration either — `nearby_businesses` filters on `location`,
 * so an unpinned branch never appears in "shops near me".
 */
export const PREREQUISITES: { label: string; detail: string }[] = [
  {
    label: 'Your shop name and a short description',
    detail: 'One or two lines. This is the first thing a shopper reads.',
  },
  {
    label: 'A logo and a banner',
    detail: 'Images up to 2 MB each.',
  },
  {
    label: 'At least four photos of the shop',
    detail: 'Inside, the counter, what you sell — up to 2 MB each.',
  },
  {
    label: 'Your address, and the spot on the map',
    detail:
      'Shoppers search by distance, so a branch without a pin never shows up nearby.',
  },
  {
    label: 'A contact number',
    detail: 'Shown on your shop page so customers can reach you.',
  },
  {
    label: 'One thing you sell, with its price',
    detail:
      'Just a name and a price is enough to finish — the rest of your list can wait until you are in your dashboard.',
  },
];

/**
 * Answers we can stand behind because the schema or the flow says so.
 *
 * Deliberately no pricing question: there is no billing surface in this app,
 * and inventing a "free forever" line on an indexed page is a commercial
 * promise, not a product fact. Add it when someone who can make that promise
 * writes it.
 */
export const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Can I stop halfway and finish later?',
    answer:
      'Yes. What you have typed is kept on your device, and the photos you have already uploaded stay uploaded — come back and carry on from the same step.',
  },
  {
    question: 'I have more than one branch.',
    answer:
      'Register the shop with one branch, then add the others from your dashboard. Each branch gets its own address, its own map pin and its own opening hours.',
  },
  {
    question: 'Can I change my category later?',
    answer:
      'Yes, from your shop profile. Your category decides which filters you appear under on Explore, so it is worth getting close — but nothing is locked in.',
  },
  {
    question: 'What happens to my photos?',
    answer:
      'They appear on your public shop page, under "Inside the shop". You can replace or remove any of them later.',
  },
  {
    question: 'Do I need a computer?',
    answer:
      'No. The form works on a phone, and pinning your branch is easier there — you can use your current location instead of searching the map.',
  },
];
