// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api/register-business';
import type { BusinessProps } from '../../validator/business-registration-form-schema';
import { useRegistrationSubmission } from '../useRegistrationSubmission';

vi.mock('../../api/register-business', () => ({
  registerBusiness: vi.fn(),
  uploadRegistrationFile: vi.fn(),
  uploadOfferingImage: vi.fn(),
  createRegistrationOfferings: vi.fn(),
  createRegistrationDeal: vi.fn(),
  completeRegistration: vi.fn(),
}));
vi.mock('../../actions/ownerEvents', () => ({ logOwnerEvent: vi.fn() }));

const mocked = vi.mocked(api);
// The helpers are typed as AxiosResponse; the hook never reads what they
// return, so any value stands in.
const ok = {} as never;
const BID = '11111111-1111-4111-8111-111111111111';

const file = (name: string) => new File(['x'], name, { type: 'image/png' });

const formData = (overrides: Partial<BusinessProps> = {}): BusinessProps => ({
  business_category: { id: undefined, type: 'predefined', name: 'Café' },
  shop_name: 'Test Cafe',
  description: 'desc',
  location: {
    province: 'Iloilo',
    city: 'Iloilo City',
    barangay: 'Jaro',
    street_address: '12 Calle Real',
    zip_code: '5000',
    geometry: 'lat:10.7,lng:122.5',
  },
  shop_logo: file('logo.png'),
  shop_banner: file('banner.png'),
  interior_images: ['a', 'b', 'c', 'd'].map((n) => file(`${n}.png`)),
  offerings: [{ uid: 'o1', name: 'Latte', price: 120, on_request: false }],
  deal: null,
  accepted_terms: true,
  ...overrides,
});

// `@testing-library/react` needs `@testing-library/dom`, which is not
// installed (and the stack is frozen) — so the same createRoot + act harness
// the other happy-dom tests use, shaped like its `renderHook`.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const unmounts: (() => void)[] = [];

function renderHook<T>(hook: () => T): { result: { current: T } } {
  const result = {} as { current: T };
  const Probe = () => {
    result.current = hook();
    return null;
  };
  const root = createRoot(document.createElement('div'));
  act(() => root.render(createElement(Probe)));
  unmounts.push(() => act(() => root.unmount()));
  return { result };
}

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
});

const images = new Map<string, File>();
const clearDraft = vi.fn();

const setup = (requireDocuments = false) =>
  renderHook(() =>
    useRegistrationSubmission({
      requireDocuments,
      steps: [
        { title: 'Business Category' },
        { title: 'Shop Information' },
        { title: 'Gallery' },
        { title: 'What You Offer' },
        { title: 'A Launch Deal' },
        { title: 'Review & Submit' },
      ],
      offeringMode: 'services',
      offeringImages: { get: (uid: string) => images.get(uid) },
      clearDraft,
    }),
  );

const fileKinds = () =>
  mocked.uploadRegistrationFile.mock.calls.map(([, kind, , index]) =>
    index === undefined ? kind : `${kind}#${index}`,
  );

beforeEach(() => {
  vi.clearAllMocks();
  images.clear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocked.registerBusiness.mockResolvedValue({ id: BID, status: 'verified' });
  mocked.uploadRegistrationFile.mockResolvedValue(ok);
  mocked.uploadOfferingImage.mockResolvedValue(`${BID}/offering.webp`);
  mocked.createRegistrationOfferings.mockResolvedValue(ok);
  mocked.createRegistrationDeal.mockResolvedValue(ok);
  mocked.completeRegistration.mockResolvedValue({ status: 'verified' });
});

describe('useRegistrationSubmission', () => {
  it('runs every phase in order and finishes clean', async () => {
    images.set('o1', file('latte.png'));
    const { result } = setup();

    await act(() => result.current.submit(formData()));

    expect(mocked.registerBusiness).toHaveBeenCalledTimes(1);
    expect(fileKinds()).toEqual([
      'shop_logo',
      'shop_banner',
      'interior_image#0',
      'interior_image#1',
      'interior_image#2',
      'interior_image#3',
    ]);
    expect(mocked.createRegistrationOfferings).toHaveBeenCalledWith(
      BID,
      [
        {
          name: 'Latte',
          price: 120,
          on_request: false,
          image_url: `${BID}/offering.webp`,
        },
      ],
      'service',
    );
    expect(mocked.createRegistrationDeal).not.toHaveBeenCalled();
    expect(result.current.showSuccessDialog).toBe(true);
    expect(result.current.created).toEqual({ id: BID, status: 'verified' });
    expect(result.current.submitError).toBeNull();
    expect(clearDraft).toHaveBeenCalledTimes(1);
  });

  it('does not show success or clear the draft if registration completion fails', async () => {
    mocked.completeRegistration.mockRejectedValueOnce(
      new Error('Registration is incomplete: shop banner'),
    );
    const { result } = setup();

    await act(() => result.current.submit(formData()));

    expect(result.current.showSuccessDialog).toBe(false);
    expect(result.current.submitError).toBe(
      'Registration is incomplete: shop banner',
    );
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it('accepts one interior photo and skips uploading an empty optional banner', async () => {
    const { result } = setup();

    await act(() =>
      result.current.submit(
        formData({
          shop_banner: undefined,
          interior_images: [file('inside.png')],
        }),
      ),
    );

    expect(fileKinds()).toEqual(['shop_logo', 'interior_image#0']);
    expect(mocked.completeRegistration).toHaveBeenCalledWith(BID);
    expect(result.current.showSuccessDialog).toBe(true);
  });

  it('keeps the draft when a write fails after the shop row exists', async () => {
    mocked.uploadRegistrationFile.mockRejectedValueOnce(
      new Error('Upload failed'),
    );
    const { result } = setup();

    await act(() => result.current.submit(formData()));

    expect(result.current.submitError).toBe('Upload failed');
    expect(result.current.showSuccessDialog).toBe(false);
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it('retries in-session without re-creating or re-sending finished writes', async () => {
    // Logo succeeds, banner fails on the first attempt.
    mocked.uploadRegistrationFile
      .mockResolvedValueOnce(ok)
      .mockRejectedValueOnce(new Error('Network Error'));
    const { result } = setup();

    await act(() => result.current.submit(formData()));
    mocked.uploadRegistrationFile.mockClear();
    await act(() => result.current.submit(formData()));

    expect(mocked.registerBusiness).toHaveBeenCalledTimes(1);
    expect(fileKinds()[0]).toBe('shop_banner');
    expect(fileKinds()).not.toContain('shop_logo');
    expect(result.current.showSuccessDialog).toBe(true);
  });

  it('keeps uploaded offering photos when the offerings write is retried', async () => {
    images.set('o1', file('latte.png'));
    mocked.createRegistrationOfferings.mockRejectedValueOnce(
      new Error('Network Error'),
    );
    const { result } = setup();

    await act(() => result.current.submit(formData()));
    await act(() => result.current.submit(formData()));

    expect(mocked.uploadOfferingImage).toHaveBeenCalledTimes(1);
    const [, rows] = mocked.createRegistrationOfferings.mock.calls[1];
    expect(rows[0].image_url).toBe(`${BID}/offering.webp`);
  });

  it('resumes in a fresh session by getting the existing draft back from the server', async () => {
    // First session: the shop row is created, then an upload fails.
    mocked.uploadRegistrationFile.mockRejectedValueOnce(
      new Error('Network Error'),
    );
    const first = setup();
    await act(() => first.result.current.submit(formData()));
    expect(first.result.current.showSuccessDialog).toBe(false);

    // A reload or another device: nothing survives client-side. Phase 1 asks
    // the server again, which returns the same draft rather than a new shop.
    const second = setup();
    await act(() => second.result.current.submit(formData()));

    expect(mocked.registerBusiness).toHaveBeenCalledTimes(2);
    expect(
      mocked.uploadRegistrationFile.mock.calls.every(([bid]) => bid === BID),
    ).toBe(true);
    expect(second.result.current.created).toEqual({
      id: BID,
      status: 'verified',
    });
    expect(second.result.current.showSuccessDialog).toBe(true);
  });

  it('writes an offering without its photo when only the photo fails', async () => {
    images.set('o1', file('latte.png'));
    mocked.uploadOfferingImage.mockRejectedValueOnce(new Error('HEIC'));
    const { result } = setup();

    await act(() => result.current.submit(formData()));

    const [, rows] = mocked.createRegistrationOfferings.mock.calls[0];
    expect(rows[0].image_url).toBeNull();
    expect(result.current.showSuccessDialog).toBe(true);
  });

  it('writes the deal with its photo and passes `publish` through untouched', async () => {
    images.set('d1', file('deal.png'));
    const { result } = setup();

    await act(() =>
      result.current.submit(
        formData({
          deal: {
            uid: 'd1',
            code: 'OPEN10',
            discount_type: 'percentage',
            discount_value: 10,
            duration_days: 30,
            publish: false,
          },
        }),
      ),
    );

    expect(mocked.createRegistrationDeal).toHaveBeenCalledWith(
      BID,
      expect.objectContaining({
        code: 'OPEN10',
        publish: false,
        image_url: `${BID}/offering.webp`,
      }),
    );
  });

  it('refuses to submit without documents when they are required', async () => {
    const { result } = setup(true);

    await act(() => result.current.submit(formData()));

    expect(result.current.submitError).toMatch(/business license/);
    expect(mocked.registerBusiness).not.toHaveBeenCalled();
  });

  it('uploads documents only when they are required', async () => {
    const docs = {
      business_license: file('license.pdf'),
      tax_certificate: file('tax.pdf'),
    };
    const off = setup(false);
    await act(() => off.result.current.submit(formData(docs)));
    expect(fileKinds()).not.toContain('business_license');

    vi.clearAllMocks();
    mocked.registerBusiness.mockResolvedValue({ id: BID, status: null });
    mocked.uploadRegistrationFile.mockResolvedValue(ok);
    mocked.createRegistrationOfferings.mockResolvedValue(ok);
    const on = setup(true);
    await act(() => on.result.current.submit(formData(docs)));
    expect(fileKinds()).toEqual(
      expect.arrayContaining(['business_license', 'tax_certificate']),
    );
  });

  it('ignores a second Submit while the first is in flight', async () => {
    let release: (value: { id: string; status: string }) => void = () => {};
    mocked.registerBusiness.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const { result } = setup();

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.submit(formData());
    });
    await act(() => result.current.submit(formData()));
    await act(async () => {
      release({ id: BID, status: 'verified' });
      await first;
    });

    expect(mocked.registerBusiness).toHaveBeenCalledTimes(1);
    expect(mocked.createRegistrationOfferings).toHaveBeenCalledTimes(1);
  });

  it('names the steps that hold invalid fields', () => {
    const { result } = setup();

    act(() =>
      result.current.handleInvalid({
        shop_logo: { type: 'custom', message: 'Logo is required' },
        location: { zip_code: { type: 'custom', message: 'bad' } },
      }),
    );

    expect(result.current.submitError).toBe(
      'Some fields still need attention (Gallery, Shop Information). Go back and fix them before submitting.',
    );
  });
});
