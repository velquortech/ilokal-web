// @vitest-environment happy-dom

/**
 * The menu step's add-item interaction.
 *
 * Isolated from the wizard provider on purpose: the browser probe showed
 * `addDraft` running to completion (the name field cleared) while the form
 * value stayed empty, so this pins the component against a plain `useForm`
 * to say whether the fault is in the step or in the shell around it.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fullSchema,
  type BusinessProps,
} from '../validator/business-registration-form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { DEFAULT_OFFERING_VOCABULARY } from '@/lib/utils/offeringVocabulary';
import { useFormCache } from '../hooks/useFormCache';

const formRef: { current: UseFormReturn<BusinessProps> | null } = {
  current: null,
};

/** Records what the step attaches, so the uid keying can be asserted. */
const imageStore = new Map<string, File>();
const removedUids: string[] = [];

vi.mock('../provider/registration-form-provider', () => ({
  useMultiStepForm: () => ({
    form: formRef.current,
    vocabulary: DEFAULT_OFFERING_VOCABULARY,
    offeringImages: {
      set: (uid: string, file: File | null) => {
        if (file) imageStore.set(uid, file);
        else imageStore.delete(uid);
      },
      get: (uid: string) => imageStore.get(uid),
      remove: (uid: string) => {
        imageStore.delete(uid);
        removedUids.push(uid);
      },
      hydrate: async () => {},
      cached: true,
    },
  }),
}));

const { ShopOfferings } = await import('../steps/Offerings');

function Harness({
  withResolver = false,
  withWatchTrigger = false,
  withCache = false,
}: {
  withResolver?: boolean;
  withWatchTrigger?: boolean;
  withCache?: boolean;
}) {
  const form = useForm<BusinessProps>({
    // The wizard's real config: onChange + a zodResolver over the WHOLE
    // schema, most of which is invalid while the owner is mid-wizard.
    ...(withResolver
      ? { mode: 'onChange' as const, resolver: zodResolver(fullSchema) }
      : {}),
    defaultValues: { offerings: [] } as Partial<BusinessProps> as BusinessProps,
  });
  formRef.current = form;

  // The provider re-validates the CURRENT step's fields on every change, by
  // subscribing with form.watch() and calling form.trigger() from inside that
  // subscription. Reproduced here because it is the last difference between
  // the wizard and a plain form.
  React.useEffect(() => {
    if (!withWatchTrigger) return;
    const subscription = form.watch(() => {
      form.trigger(['business_category']);
    });
    return () => subscription.unsubscribe();
  }, [form, withWatchTrigger]);

  return withCache ? <CachedStep form={form} /> : <ShopOfferings />;
}

/** Mounts the wizard's real form cache alongside the step. */
function CachedStep({ form }: { form: UseFormReturn<BusinessProps> }) {
  useFormCache(form);
  return <ShopOfferings />;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  formRef.current = null;
  imageStore.clear();
  removedUids.length = 0;
});

function type(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function clickAdd() {
  const button = Array.from(container.querySelectorAll('button')).find((b) =>
    /^Add /i.test(b.textContent ?? ''),
  )!;
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('adding an item', () => {
  it('puts it in the form value and on screen', () => {
    act(() => root.render(<Harness />));

    type('#offering-name', 'Adobo');
    type('#offering-price', '120');
    clickAdd();

    expect(formRef.current!.getValues('offerings')).toMatchObject([
      { name: 'Adobo', price: 120, on_request: false },
    ]);
    // Every row carries a stable client id — the photo cache is keyed on it,
    // and an array index would re-map the moment an item is removed.
    expect(formRef.current!.getValues('offerings')[0].uid).toBeTruthy();
    expect(container.querySelectorAll('li')).toHaveLength(1);
    expect(container.textContent).toContain('Adobo');
  });

  it('clears the draft so the next item can be typed straight away', () => {
    act(() => root.render(<Harness />));

    type('#offering-name', 'Adobo');
    type('#offering-price', '120');
    clickAdd();

    expect(
      container.querySelector<HTMLInputElement>('#offering-name')!.value,
    ).toBe('');
  });

  it('accumulates rather than replacing', () => {
    act(() => root.render(<Harness />));

    type('#offering-name', 'Adobo');
    type('#offering-price', '120');
    clickAdd();
    type('#offering-name', 'Sinigang');
    type('#offering-price', '150');
    clickAdd();

    expect(formRef.current!.getValues('offerings')).toHaveLength(2);
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('refuses a nameless item and says so', () => {
    act(() => root.render(<Harness />));

    type('#offering-price', '120');
    clickAdd();

    expect(formRef.current!.getValues('offerings')).toEqual([]);
    expect(container.textContent).toContain('Enter a name');
  });

  it('refuses a priced item with no price', () => {
    act(() => root.render(<Harness />));

    type('#offering-name', 'Adobo');
    clickAdd();

    expect(formRef.current!.getValues('offerings')).toEqual([]);
    expect(container.textContent).toContain('Enter a price');
  });
});

describe('under the wizard\u2019s real form config', () => {
  it('still records the item with an onChange zodResolver attached', () => {
    // The browser probe showed the draft clearing while the form value stayed
    // empty — i.e. append() ran and nothing landed. The only difference from
    // the passing cases above is this resolver, so it is pinned here.
    act(() => root.render(<Harness withResolver />));

    type('#offering-name', 'Adobo');
    type('#offering-price', '120');
    clickAdd();

    expect(formRef.current!.getValues('offerings')).toMatchObject([
      { name: 'Adobo', price: 120, on_request: false },
    ]);
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });
});

describe('the provider\u2019s watch-then-trigger loop', () => {
  it('does not swallow the appended item', () => {
    // form.watch(cb) fires on the field-array update, and the cb calls
    // trigger() re-entrantly. If RHF re-syncs the field array from the
    // pre-append values while that is in flight, the item vanishes with no
    // error anywhere — which is exactly what the browser showed.
    act(() => root.render(<Harness withResolver withWatchTrigger />));

    type('#offering-name', 'Adobo');
    type('#offering-price', '120');
    clickAdd();

    expect(formRef.current!.getValues('offerings')).toMatchObject([
      { name: 'Adobo', price: 120, on_request: false },
    ]);
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });
});

describe('with the wizard\u2019s form cache mounted', () => {
  it('keeps the appended item', () => {
    act(() => root.render(<Harness withResolver withWatchTrigger withCache />));

    type('#offering-name', 'Adobo');
    type('#offering-price', '120');
    clickAdd();

    expect(formRef.current!.getValues('offerings')).toMatchObject([
      { name: 'Adobo', price: 120, on_request: false },
    ]);
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });
});

describe('under React StrictMode', () => {
  it('keeps the appended item through the double-invoked mount', () => {
    // Next.js dev runs StrictMode, which mounts effects twice. RHF's
    // useFieldArray re-syncs from the form values on mount, so a second mount
    // landing after the first can revert an append with no error anywhere —
    // and dev is where owners and reviewers actually look at this.
    act(() =>
      root.render(
        <React.StrictMode>
          <Harness withResolver withWatchTrigger withCache />
        </React.StrictMode>,
      ),
    );

    type('#offering-name', 'Adobo');
    type('#offering-price', '120');
    clickAdd();

    expect(formRef.current!.getValues('offerings')).toMatchObject([
      { name: 'Adobo', price: 120, on_request: false },
    ]);
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });
});

describe('photos (IMG2/IMG3)', () => {
  it('keys the photo to the row, not to its position', () => {
    // The whole reason rows carry a uid. Index keys re-map on every removal,
    // so deleting the first item would silently move the second item's photo
    // onto it.
    act(() => root.render(<Harness />));

    type('#offering-name', 'Adobo');
    type('#offering-price', '120');
    clickAdd();
    type('#offering-name', 'Sinigang');
    type('#offering-price', '150');
    clickAdd();

    const [first, second] = formRef.current!.getValues('offerings');
    expect(first.uid).not.toBe(second.uid);
  });

  it('drops the photo when its row is removed', () => {
    // IMG3 — otherwise every discarded photo stays in IndexedDB for the life
    // of the origin.
    act(() => root.render(<Harness />));

    type('#offering-name', 'Adobo');
    type('#offering-price', '120');
    clickAdd();

    const uid = formRef.current!.getValues('offerings')[0].uid;
    const removeButton = Array.from(container.querySelectorAll('button')).find(
      (b) => /^Remove /i.test(b.getAttribute('aria-label') ?? ''),
    )!;
    act(() => {
      removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(removedUids).toContain(uid);
    expect(formRef.current!.getValues('offerings')).toHaveLength(0);
  });

  it('removes the row the owner clicked, not the one at that index later', () => {
    act(() => root.render(<Harness />));

    for (const [name, price] of [
      ['Adobo', '120'],
      ['Sinigang', '150'],
      ['Lechon', '400'],
    ]) {
      type('#offering-name', name);
      type('#offering-price', price);
      clickAdd();
    }
    const uids = formRef
      .current!.getValues('offerings')
      .map((o: { uid: string }) => o.uid);

    // Remove the middle one.
    const buttons = Array.from(container.querySelectorAll('button')).filter(
      (b) => /^Remove /i.test(b.getAttribute('aria-label') ?? ''),
    );
    act(() => {
      buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(removedUids).toEqual([uids[1]]);
    expect(
      formRef
        .current!.getValues('offerings')
        .map((o: { uid: string }) => o.uid),
    ).toEqual([uids[0], uids[2]]);
  });

  it('offers the photo picker as optional', () => {
    // Optional is the RM5 trade-off: the item is required, the picture is not.
    act(() => root.render(<Harness />));
    expect(container.textContent).toContain('Photo (optional)');
  });
});
