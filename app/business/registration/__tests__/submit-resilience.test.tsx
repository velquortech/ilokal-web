// @vitest-environment happy-dom

/**
 * The 2026-08-22 production bug: a partial submit published a live, EMPTY shop.
 *
 * The row was created first, then every file `await`ed in a bare loop with no
 * per-upload catch — so one interior-image failure threw, aborted before the
 * catalogue was written, and left the owner reading "Failed to submit
 * application" while their already-`verified` shop sat on /explore with no
 * products and no photos. Confirmed in production (`reg_step_completed` ×6,
 * `reg_submitted` 0, shop live and empty).
 *
 * These tests pin the two properties that fix it: the CATALOGUE IS WRITTEN
 * BEFORE ANY DISPLAY FILE, and a display-file failure NEVER discards the
 * registration.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { UseFormReturn } from 'react-hook-form';
import type { BusinessProps } from '../validator/business-registration-form-schema';

/** Every API call, in the order it happened — the thing under test. */
const callLog: string[] = [];
const logOwnerEvent = vi.fn<(...args: unknown[]) => void>();

const api = vi.hoisted(() => ({
  registerBusiness: vi.fn(),
  uploadRegistrationFile: vi.fn(),
  uploadOfferingImage: vi.fn(),
  createRegistrationOfferings: vi.fn(),
  createRegistrationDeal: vi.fn(),
}));

vi.mock('../api/register-business', () => api);
vi.mock('../actions/ownerEvents', () => ({
  logOwnerEvent: (...args: unknown[]) => logOwnerEvent(...args),
}));
vi.mock('../hooks/useFormCache', () => ({
  useFormCache: () => ({
    clearCache: vi.fn(),
    cacheFile: vi.fn(),
    cacheFiles: vi.fn(),
    clearFileCache: vi.fn(),
    isHydrated: true,
  }),
}));
vi.mock('../data/steps', () => ({
  getSteps: () =>
    [
      'Business Category',
      'Shop Information',
      'Gallery',
      'What You Offer',
      'A Launch Deal',
      'Review & Submit',
    ].map((title) => ({ title, description: '', component: null })),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('./application-success-dialog', () => ({
  ApplicationSuccessDialog: () => null,
}));

const { MultiStepFormProvider, useMultiStepForm } =
  await import('../provider/registration-form-provider');
const { ShopRegistrationContent } =
  await import('../components/shop-registration-content');

const formRef: { current: UseFormReturn<BusinessProps> | null } = {
  current: null,
};

function Probe() {
  formRef.current = useMultiStepForm().form;
  return null;
}

function photo(name: string) {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
}

/** A form filled in well enough to pass the submit guard. */
function fillValidForm() {
  const form = formRef.current!;
  form.setValue('business_category', {
    type: 'predefined',
    name: 'Café',
    description: '',
  });
  form.setValue('shop_name', 'Pitstop');
  form.setValue('description', 'A cosy café');
  form.setValue('location', {
    province: 'Iloilo',
    city: 'Iloilo City',
    barangay: 'City Proper',
    street_address: 'Iznart Street 12',
    zip_code: '5000',
    geometry: 'POINT(122.56 10.69)',
  });
  form.setValue('shop_logo', photo('logo.png'));
  form.setValue('shop_banner', photo('banner.png'));
  form.setValue('interior_images', [
    photo('i1.png'),
    photo('i2.png'),
    photo('i3.png'),
    photo('i4.png'),
  ]);
  form.setValue('offerings', [
    { uid: 'o1', name: 'Flat White', price: 185, on_request: false },
  ]);
  form.setValue('deal', null);
  form.setValue('accepted_terms', true);
}

let container: HTMLDivElement;
let root: Root;

async function submit() {
  const form = container.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
  });
  // Let the awaited chain inside handleSubmitForm settle.
  await act(async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  callLog.length = 0;
  vi.clearAllMocks();
  localStorage.clear();

  api.registerBusiness.mockImplementation(async () => {
    callLog.push('createBusiness');
    return { id: 'biz-1', status: 'verified' };
  });
  api.uploadOfferingImage.mockImplementation(async () => {
    callLog.push('offeringPhoto');
    return 'path/offering.webp';
  });
  api.createRegistrationOfferings.mockImplementation(async () => {
    callLog.push('offerings');
  });
  api.createRegistrationDeal.mockImplementation(async () => {
    callLog.push('deal');
  });
  api.uploadRegistrationFile.mockImplementation(
    async (_bid: string, kind: string) => {
      callLog.push(`file:${kind}`);
    },
  );

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MultiStepFormProvider rawBusinessTypes={[]} requireDocuments={false}>
        <Probe />
        <ShopRegistrationContent />
      </MultiStepFormProvider>,
    );
  });
  act(() => fillValidForm());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('submit ordering', () => {
  it('writes the catalogue BEFORE any display file', async () => {
    await submit();

    const offeringsAt = callLog.indexOf('offerings');
    const firstFileAt = callLog.findIndex((entry) => entry.startsWith('file:'));

    expect(offeringsAt).toBeGreaterThan(-1);
    expect(firstFileAt).toBeGreaterThan(-1);
    // The whole point: products are what make a shop worth opening, so they
    // must not sit behind six image uploads that can fail.
    expect(offeringsAt).toBeLessThan(firstFileAt);
  });

  it('creates the business row first of all', async () => {
    await submit();
    expect(callLog[0]).toBe('createBusiness');
  });
});

describe('a failed display file does not discard the registration', () => {
  it('still writes the catalogue when the FIRST upload throws', async () => {
    api.uploadRegistrationFile.mockRejectedValue(new Error('network'));

    await submit();

    // Under the old order this threw before `offerings` was ever called.
    expect(api.createRegistrationOfferings).toHaveBeenCalledTimes(1);
  });

  it('keeps uploading the rest after one fails', async () => {
    api.uploadRegistrationFile.mockImplementation(
      async (_bid: string, kind: string, _file: File, idx?: number) => {
        if (kind === 'interior_image' && idx === 1) throw new Error('boom');
        callLog.push(`file:${kind}${idx ?? ''}`);
      },
    );

    await submit();

    // 1 logo + 1 banner + 4 interiors, one of which failed ⇒ 5 recorded.
    expect(callLog.filter((e) => e.startsWith('file:'))).toHaveLength(5);
  });

  it('reports the failure as a SUCCESS with a caveat, not an error', async () => {
    api.uploadRegistrationFile.mockImplementation(
      async (_bid: string, kind: string) => {
        if (kind === 'shop_logo') throw new Error('boom');
      },
    );

    await submit();

    const text = container.textContent ?? '';
    // Telling an owner "failed" while their shop is live is the defect.
    expect(text).toContain("didn't upload");
    expect(text).toContain('your shop logo');
    expect(text).not.toContain('Failed to submit application');
  });

  it('still fires reg_submitted, naming which files failed', async () => {
    api.uploadRegistrationFile.mockImplementation(
      async (_bid: string, kind: string) => {
        if (kind === 'shop_banner') throw new Error('boom');
      },
    );

    await submit();

    const submitted = logOwnerEvent.mock.calls.find(
      (call) => call[0] === 'reg_submitted',
    );
    // Previously this event never fired on a partial submit, so a half-built
    // shop was indistinguishable from an abandoned one.
    expect(submitted).toBeDefined();
    expect(
      (submitted![1] as { upload_failures: string[] }).upload_failures,
    ).toEqual(['shop_banner']);
  });

  it('reports no caveat when everything lands', async () => {
    await submit();
    expect(container.textContent ?? '').not.toContain("didn't upload");
    const submitted = logOwnerEvent.mock.calls.find(
      (call) => call[0] === 'reg_submitted',
    );
    expect(
      (submitted![1] as { upload_failures: string[] }).upload_failures,
    ).toEqual([]);
  });
});

describe('a failed CATALOGUE write is still fatal', () => {
  it('surfaces an error, because a shop with no catalogue is the empty page', async () => {
    api.createRegistrationOfferings.mockRejectedValue(new Error('nope'));

    await submit();

    const text = container.textContent ?? '';
    expect(text).toContain('Submission Error');
    // Not the partial-success caveat: there is no catalogue, so this is a real
    // failure and must read as one.
    expect(text).not.toContain("didn't upload");
    // Display files come AFTER the catalogue, so none were attempted.
    expect(api.uploadRegistrationFile).not.toHaveBeenCalled();
  });

  it('does not claim the submission succeeded', async () => {
    api.createRegistrationOfferings.mockRejectedValue(new Error('nope'));
    await submit();
    expect(
      logOwnerEvent.mock.calls.filter((call) => call[0] === 'reg_submitted'),
    ).toHaveLength(0);
  });
});

describe('upload progress survives a reload', () => {
  /**
   * The marker only has to survive an INTERRUPTED submission — that is the only
   * time a retry happens. On success `resetResumeMarkers()` clears it along with
   * the cached business id, deliberately: a set kept against a finished shop
   * would make the NEXT registration skip files it never uploaded.
   */
  const stored = (): string[] =>
    JSON.parse(localStorage.getItem('ilokal-registration-uploaded') ?? '[]');

  it('keeps what landed when the submission is interrupted', async () => {
    // The catalogue lands, then the deal write throws. This is the only
    // EXCEPTION-shaped interruption left after uploads became non-fatal; the
    // case the marker really exists for is a closed tab or a crash mid-upload,
    // which has no code path to trigger.
    act(() => {
      formRef.current!.setValue('deal', {
        uid: 'd1',
        code: 'OPEN10',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        duration_days: 30,
        publish: false,
      });
    });
    api.createRegistrationDeal.mockRejectedValue(new Error('nope'));

    await submit();

    // A retry must not write the catalogue twice. Without persistence the ref
    // is empty on a fresh page, and the same class of bug re-uploaded the logo
    // and re-APPENDED the interior photos (the server appends rather than
    // replaces), duplicating gallery images.
    expect(stored()).toContain('offerings');
  });

  it('clears the marker on success, so the next registration starts clean', async () => {
    await submit();
    expect(localStorage.getItem('ilokal-registration-uploaded')).toBeNull();
    expect(localStorage.getItem('ilokal-registration-business-id')).toBeNull();
  });

  it('treats a corrupt stored value as empty rather than throwing', async () => {
    localStorage.setItem('ilokal-registration-uploaded', '{not json');
    // Re-mount so the ref is seeded from the corrupt value.
    act(() => root.unmount());
    container.remove();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MultiStepFormProvider rawBusinessTypes={[]} requireDocuments={false}>
          <Probe />
          <ShopRegistrationContent />
        </MultiStepFormProvider>,
      );
    });
    act(() => fillValidForm());

    await submit();

    // Re-uploading is recoverable; a parse error at submit time is not.
    expect(api.createRegistrationOfferings).toHaveBeenCalledTimes(1);
    expect(container.textContent ?? '').not.toContain('Submission Error');
  });
});
