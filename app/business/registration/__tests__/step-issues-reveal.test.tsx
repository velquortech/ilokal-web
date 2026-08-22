// @vitest-environment happy-dom

/**
 * Phase 0 of `.claude/REGISTRATION_FUNNEL.md`: pressing Next on an invalid step
 * must EXPLAIN itself instead of doing nothing.
 *
 * This mounts the real provider against the real nav, because the defect being
 * pinned was an interaction between them: the nav disabled Next on
 * `!canProceed`, so the provider's `reg_step_error` branch could not run. A test
 * of either piece alone would have passed throughout.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { UseFormReturn } from 'react-hook-form';
import type { BusinessProps } from '../validator/business-registration-form-schema';

const logOwnerEvent = vi.fn<(...args: unknown[]) => void>();
vi.mock('../actions/ownerEvents', () => ({
  logOwnerEvent: (...args: unknown[]) => logOwnerEvent(...args),
}));

// The real cache talks to IndexedDB. `isHydrated: true` is what unblocks the
// provider's validation effect, so it has to be truthy here.
vi.mock('../hooks/useFormCache', () => ({
  useFormCache: () => ({
    clearCache: vi.fn(),
    cacheFile: vi.fn(),
    cacheFiles: vi.fn(),
    clearFileCache: vi.fn(),
    isHydrated: true,
  }),
}));

// The step components pull in the map and the offering editors; the nav only
// needs the step COUNT and titles, so keep the tree light and deterministic.
vi.mock('../data/steps', () => ({
  getSteps: (requireDocuments: boolean) =>
    (requireDocuments
      ? [
          'Business Category',
          'Shop Information',
          'Gallery',
          'Documents',
          'What You Offer',
          'A Launch Deal',
          'Review & Submit',
        ]
      : [
          'Business Category',
          'Shop Information',
          'Gallery',
          'What You Offer',
          'A Launch Deal',
          'Review & Submit',
        ]
    ).map((title) => ({ title, description: '', component: null })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('../components/application-success-dialog', () => ({
  ApplicationSuccessDialog: () => null,
}));

const { MultiStepFormProvider, useMultiStepForm } =
  await import('../provider/registration-form-provider');
const { RegistrationNav } = await import('../components/register-nav');

const formRef: { current: UseFormReturn<BusinessProps> | null } = {
  current: null,
};
const stepRef = { current: 0 };

function Probe() {
  const { form, step } = useMultiStepForm();
  formRef.current = form;
  stepRef.current = step;
  return null;
}

let container: HTMLDivElement;
let root: Root;

function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MultiStepFormProvider rawBusinessTypes={[]} requireDocuments={false}>
        <Probe />
        <RegistrationNav
          isSubmitting={false}
          showSuccessDialog={false}
          onSuccessDialogChange={() => {}}
          createdBusiness={null}
        />
      </MultiStepFormProvider>,
    );
  });
}

function nextButton(): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((el) =>
    el.textContent?.includes('Next'),
  );
  if (!button) throw new Error('Next button not rendered');
  return button as HTMLButtonElement;
}

function clickNext() {
  act(() => {
    nextButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** Let the awaited `form.trigger()` inside `nextStep` settle. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function eventsNamed(name: string) {
  return logOwnerEvent.mock.calls.filter((call) => call[0] === name);
}

beforeEach(() => {
  logOwnerEvent.mockClear();
  localStorage.clear();
  mount();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('registration step issues', () => {
  it('leaves Next clickable on an invalid step', () => {
    // The whole defect in one assertion: a disabled Next is what made the
    // blocking field invisible and the stall event unreachable.
    expect(nextButton().disabled).toBe(false);
  });

  it('shows nothing before the owner has asked to continue', () => {
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('names what is missing when Next is pressed on an invalid step', async () => {
    clickNext();
    await settle();

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    // Step 1 is the category; the message is the schema's own words.
    expect(alert?.textContent).toContain('Category is required');
  });

  it('fires reg_step_error with the offending path — the event that had 0 rows', async () => {
    clickNext();
    await settle();

    const stalls = eventsNamed('reg_step_error');
    expect(stalls).toHaveLength(1);

    const payload = stalls[0][1] as {
      step: number;
      step_id: string | null;
      fields: string[];
      paths: string[];
    };
    expect(payload.step).toBe(1);
    expect(payload.step_id).toBe('Business Category');
    expect(payload.paths).toContain('business_category.name');
  });

  it('does not advance, and does not claim the step was completed', async () => {
    clickNext();
    await settle();

    expect(stepRef.current).toBe(1);
    expect(eventsNamed('reg_step_completed')).toHaveLength(0);
  });

  /**
   * The summary must track the form LIVE — no second Next press.
   *
   * This is the case the original Phase 0 implementation got wrong: `stepIssues`
   * was `useMemo`'d on `form.formState.errors`, and RHF MUTATES that object in
   * place, so the reference survived the change and the list froze at whatever
   * was wrong when Next was pressed. An owner who filled in the named field kept
   * being told it was required — worse than the dead grey button it replaced.
   * The earlier test below missed it by asserting only AFTER clicking Next again.
   */
  describe('the summary tracks the form live', () => {
    /** Get to step 2, then stall it so the summary is on screen. */
    async function stallOnStepTwo() {
      await act(async () => {
        formRef.current?.setValue(
          'business_category',
          { type: 'predefined', name: 'Café', description: '' },
          { shouldValidate: true },
        );
      });
      await settle();
      clickNext();
      await settle();
      expect(stepRef.current).toBe(2);

      clickNext();
      await settle();
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        'Shop name is required',
      );
    }

    it('drops an issue as soon as that field is filled in', async () => {
      await stallOnStepTwo();

      await act(async () => {
        formRef.current?.setValue('shop_name', "Ian's Shop", {
          shouldValidate: true,
        });
      });
      await settle();

      const text = container.querySelector('[role="alert"]')?.textContent ?? '';
      // Gone without pressing Next again.
      expect(text).not.toContain('Shop name is required');
      // The others are untouched, so the owner still knows what is left.
      expect(text).toContain('Description is required');
    });

    it('hides the summary entirely once nothing is left', async () => {
      await stallOnStepTwo();

      await act(async () => {
        const form = formRef.current!;
        form.setValue('shop_name', "Ian's Shop", { shouldValidate: true });
        form.setValue('description', 'A cosy little shop', {
          shouldValidate: true,
        });
        form.setValue(
          'location',
          {
            province: 'Iloilo',
            city: 'Iloilo City',
            barangay: 'City Proper',
            street_address: 'Iznart Street 12',
            zip_code: '5000',
            geometry: 'POINT(122.56 10.69)',
          },
          { shouldValidate: true },
        );
      });
      await settle();

      expect(container.querySelector('[role="alert"]')).toBeNull();
    });
  });

  it('advances and clears the summary once the step is valid', async () => {
    clickNext();
    await settle();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();

    await act(async () => {
      formRef.current?.setValue(
        'business_category',
        { type: 'predefined', name: 'Café', description: '' },
        { shouldValidate: true },
      );
    });
    await settle();

    clickNext();
    await settle();

    expect(stepRef.current).toBe(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(eventsNamed('reg_step_completed')).toHaveLength(1);
  });
});
