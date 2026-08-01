// @vitest-environment happy-dom

/**
 * The verified moment fires from a RENDER, not from a mutation — so the only
 * thing stopping it congratulating the owner on every page load forever is the
 * storage marker. These tests are mostly about it staying quiet.
 *
 * react-dom/client + happy-dom per repo convention (the stack is frozen and
 * @testing-library/dom is not installed).
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const celebrate = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/components/custom/Celebrate', () => ({
  useCelebrate: () => celebrate,
}));
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

import { VerifiedCelebration } from '../VerifiedCelebration';

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  celebrate.mockClear();
  toastSuccess.mockClear();
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(props: { businessId?: string; status?: string | null }) {
  act(() => {
    root.render(<VerifiedCelebration {...props} />);
  });
}

describe('VerifiedCelebration', () => {
  it('celebrates the first time a shop is seen verified', () => {
    render({ businessId: 'shop-1', status: 'verified' });
    expect(celebrate).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it('stays quiet on every later visit', () => {
    render({ businessId: 'shop-1', status: 'verified' });
    act(() => root.unmount());

    root = createRoot(container);
    celebrate.mockClear();
    toastSuccess.mockClear();
    render({ businessId: 'shop-1', status: 'verified' });

    expect(celebrate).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('marks each shop separately', () => {
    render({ businessId: 'shop-1', status: 'verified' });
    act(() => root.unmount());

    root = createRoot(container);
    celebrate.mockClear();
    render({ businessId: 'shop-2', status: 'verified' });

    expect(celebrate).toHaveBeenCalledTimes(1);
  });

  it.each(['pending', 'rejected', null, undefined])(
    'does not celebrate status %s',
    (status) => {
      render({ businessId: 'shop-1', status: status as string | null });
      expect(celebrate).not.toHaveBeenCalled();
    },
  );

  it('does nothing without a business', () => {
    render({ status: 'verified' });
    expect(celebrate).not.toHaveBeenCalled();
  });

  it('renders no markup of its own', () => {
    render({ businessId: 'shop-1', status: 'verified' });
    expect(container.innerHTML).toBe('');
  });

  it('skips rather than celebrating on every load when storage is blocked', () => {
    // Spied on the instance, not `Storage.prototype` — happy-dom's
    // localStorage does not inherit its methods from that prototype, so a
    // prototype spy silently never fires and the test would pass by accident.
    const getItem = vi
      .spyOn(window.localStorage, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage disabled');
      });

    render({ businessId: 'shop-1', status: 'verified' });
    expect(celebrate).not.toHaveBeenCalled();

    getItem.mockRestore();
  });
});
