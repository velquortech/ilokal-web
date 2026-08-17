// @vitest-environment happy-dom

/**
 * The dialog draft hook (`useFormDraft`).
 *
 * What is pinned: the debounced autosave writes only the serializable subset
 * (`pick` drops the File), an empty form removes the draft instead of saving
 * it, a disabled hook never writes, restore merges over defaults and rejects
 * corrupt/foreign-version entries, and clearDraft removes the key. A closed
 * dialog losing a typed form is the bug this hook exists to kill, so the
 * write path is the load-bearing half.
 *
 * react-dom/client + happy-dom, per repo convention (no `@testing-library`).
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useFormDraft } from '../useFormDraft';

const KEY = 'ilokal-test-draft';

type Values = { name: string; price: number | null; file: File | null };
type Draft = Omit<Values, 'file'>;

function Harness({ enabled = true }: { enabled?: boolean }) {
  const form = useForm<Values>({
    defaultValues: { name: '', price: null, file: null },
  });
  const { readDraft, clearDraft } = useFormDraft<Values, Draft>({
    form,
    key: KEY,
    enabled,
    pick: ({ file: _file, ...rest }) => rest,
    isEmpty: (p) => !p.name && p.price == null,
    debounceMs: 200,
  });

  return (
    <div>
      <input
        id="name"
        value={form.watch('name')}
        onChange={(e) => form.setValue('name', e.target.value)}
      />
      <button
        id="set-file"
        onClick={() =>
          form.setValue('file', new File(['x'], 'a.png', { type: 'image/png' }))
        }
      >
        set file
      </button>
      <button
        id="restore"
        onClick={() =>
          form.reset({
            name: '',
            price: null,
            file: null,
            ...(readDraft() ?? {}),
          })
        }
      >
        restore
      </button>
      <button id="clear" onClick={clearDraft}>
        clear
      </button>
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.useRealTimers();
});

function render(enabled = true) {
  act(() => root.render(<Harness enabled={enabled} />));
}

function typeName(value: string) {
  const field = container.querySelector<HTMLInputElement>('#name')!;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(field, value);
  act(() => {
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const click = (id: string) => {
  act(() => {
    container
      .querySelector(`#${id}`)!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

async function advanceDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
}

const stored = () => window.localStorage.getItem(KEY);

describe('the autosave', () => {
  it('writes the draft after the debounce, excluding the file field', async () => {
    render();
    typeName('Flat White');
    click('set-file');

    expect(stored()).toBeNull();
    await advanceDebounce();

    const raw = stored();
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.v).toBe(1);
    expect(parsed.values.name).toBe('Flat White');
    // The File must never reach storage: JSON.stringify(new File()) is '{}',
    // which would restore garbage into the form.
    expect('file' in parsed.values).toBe(false);
  });

  it('removes the draft when the form returns to empty', async () => {
    render();
    typeName('Flat White');
    await advanceDebounce();
    expect(stored()).not.toBeNull();

    typeName('');
    await advanceDebounce();

    expect(stored()).toBeNull();
  });

  it('writes nothing while disabled', async () => {
    render(false);
    typeName('Flat White');
    await advanceDebounce();

    expect(stored()).toBeNull();
  });
});

describe('restore', () => {
  it('merges the draft over the defaults', () => {
    const envelope = {
      v: 1,
      timestamp: Date.now(),
      values: { name: 'Iced Latte', price: null },
    };
    window.localStorage.setItem(KEY, JSON.stringify(envelope));
    render();

    expect(container.querySelector<HTMLInputElement>('#name')!.value).toBe('');
    click('restore');
    expect(container.querySelector<HTMLInputElement>('#name')!.value).toBe(
      'Iced Latte',
    );
  });

  it('discards a corrupt entry and cleans the key', () => {
    window.localStorage.setItem(KEY, '{not json');
    render();

    click('restore');

    expect(container.querySelector<HTMLInputElement>('#name')!.value).toBe('');
    expect(stored()).toBeNull();
  });

  it('discards a foreign-version envelope', () => {
    const envelope = { v: 999, timestamp: Date.now(), values: { name: 'Old' } };
    window.localStorage.setItem(KEY, JSON.stringify(envelope));
    render();

    click('restore');

    expect(container.querySelector<HTMLInputElement>('#name')!.value).toBe('');
    expect(stored()).toBeNull();
  });

  it('drops a draft older than the max age', () => {
    const envelope = {
      v: 1,
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days
      values: { name: 'Stale' },
    };
    window.localStorage.setItem(KEY, JSON.stringify(envelope));
    render();

    click('restore');

    expect(container.querySelector<HTMLInputElement>('#name')!.value).toBe('');
    expect(stored()).toBeNull();
  });
});

describe('clearDraft', () => {
  it('removes the stored draft', async () => {
    render();
    typeName('Flat White');
    await advanceDebounce();
    expect(stored()).not.toBeNull();

    click('clear');

    expect(stored()).toBeNull();
  });
});
