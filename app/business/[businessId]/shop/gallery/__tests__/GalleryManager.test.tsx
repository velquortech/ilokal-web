// @vitest-environment happy-dom

/**
 * GalleryManager — the two behaviours that cost the owner real data if they
 * regress: a delete must be confirmed before it fires, and a change that
 * arrives while an earlier save is in flight must not be dropped.
 *
 * react-dom/client + happy-dom, per repo convention (no `@testing-library`).
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { save } = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock('@/app/business/[businessId]/actions/galleryActions', () => ({
  updateBusinessGalleryAction: save,
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
// The uploader owns the network and the canvas; neither is under test here.
const UPLOADED =
  'https://proj.supabase.co/storage/v1/object/public/interior-images/biz/c.webp';

vi.mock('@/components/custom/GalleryUploader', () => ({
  GalleryUploader: ({
    value,
    onChange,
    onRequestRemove,
  }: {
    value: string[];
    onChange: (next: string[]) => void;
    onRequestRemove?: (url: string) => void;
  }) => (
    <div>
      {value.map((url) => (
        <button
          key={url}
          data-testid={`remove-${url}`}
          onClick={() => onRequestRemove?.(url)}
        >
          remove {url}
        </button>
      ))}
      {/* Stands in for a finished upload: the real uploader calls `onChange`
          with the whole desired array once every file has landed. */}
      <button
        data-testid="upload"
        onClick={() => onChange([...value, UPLOADED])}
      >
        upload
      </button>
    </div>
  ),
}));

import { GalleryManager } from '../components/GalleryManager';

const HOST =
  'https://proj.supabase.co/storage/v1/object/public/interior-images';
const A = `${HOST}/biz/a.webp`;
const B = `${HOST}/biz/b.webp`;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  save.mockResolvedValue({ success: true, data: { saved: 1 } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(images: string[] = [A, B]) {
  act(() =>
    root.render(
      <GalleryManager
        businessId="550e8400-e29b-41d4-a716-446655440000"
        initialImages={images}
      />,
    ),
  );
}

const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
};

const findButton = (text: RegExp) =>
  Array.from(document.querySelectorAll('button')).find((b) =>
    text.test(b.textContent ?? ''),
  );

describe('GalleryManager — removing a photo', () => {
  /**
   * The delete here is immediate AND deletes the file from storage, unlike the
   * profile form's staged removal — so one stray click would be irreversible.
   */
  it('does not save until the removal is confirmed', async () => {
    render();

    await click(container.querySelector(`[data-testid="remove-${A}"]`)!);

    expect(save).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Remove this photo?');
  });

  it('saves the gallery without that photo once confirmed', async () => {
    render();

    await click(container.querySelector(`[data-testid="remove-${A}"]`)!);
    await click(findButton(/Remove photo/)!);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![1]).toEqual([B]);
  });

  it('saves nothing when the confirmation is declined', async () => {
    render();

    await click(container.querySelector(`[data-testid="remove-${A}"]`)!);
    await click(findButton(/Keep it/)!);

    expect(save).not.toHaveBeenCalled();
  });
});

describe('GalleryManager — a change during an in-flight save', () => {
  /**
   * 🔴 This used to be `if (inFlight.current) return` — a silent DROP. A batch
   * of uploads finishing while a confirmed removal was still saving discarded
   * the newer state with no toast and no retry, leaving the just-uploaded file
   * orphaned in the bucket and the owner believing it saved.
   */
  it('flushes the queued change instead of dropping it', async () => {
    let release!: () => void;
    save.mockReturnValueOnce(
      new Promise((resolve) => {
        release = () => resolve({ success: true, data: { saved: 1 } });
      }),
    );

    render();

    // First save starts and does not settle.
    await click(container.querySelector(`[data-testid="remove-${A}"]`)!);
    await click(findButton(/Remove photo/)!);
    expect(save).toHaveBeenCalledTimes(1);

    // A second change arrives while the first is still in flight.
    await click(container.querySelector(`[data-testid="remove-${B}"]`)!);
    await click(findButton(/Remove photo/)!);
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(2);
    // The queued entry is the whole desired array, so it supersedes rather than
    // stacking on the first.
    expect(save.mock.calls[1]![1]).toEqual([]);
  });
});

describe('GalleryManager — a failed save', () => {
  it('rolls back to what the server is known to hold', async () => {
    save.mockResolvedValueOnce({
      success: false,
      error: { code: 'DB_ERROR', message: 'nope' },
    });

    render();

    await click(container.querySelector(`[data-testid="remove-${A}"]`)!);
    await click(findButton(/Remove photo/)!);

    // The tile is back — showing a change the database never took would be
    // worse than the failure itself.
    expect(
      container.querySelector(`[data-testid="remove-${A}"]`),
    ).not.toBeNull();
  });

  /**
   * 🔴 The rollback must not swallow an unrelated ADDITION. A photo uploaded
   * while a removal was failing is already in the bucket; dropping it from the
   * screen orphans the file and loses the owner's work — the silent drop this
   * queue was built to remove, wearing a different hat.
   */
  it('keeps a photo uploaded while the failing save was in flight', async () => {
    let release!: () => void;
    save.mockReturnValueOnce(
      new Promise((resolve) => {
        release = () =>
          resolve({
            success: false,
            error: { code: 'DB_ERROR', message: 'x' },
          });
      }),
    );

    render();

    // A removal starts and does not settle.
    await click(container.querySelector(`[data-testid="remove-${A}"]`)!);
    await click(findButton(/Remove photo/)!);

    // An upload lands mid-flight and is queued behind the failing save.
    await click(container.querySelector('[data-testid="upload"]')!);

    await act(async () => {
      release();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The removal is undone…
    expect(
      container.querySelector(`[data-testid="remove-${A}"]`),
    ).not.toBeNull();
    // …and the upload, whose file is already in the bucket, survives it.
    expect(
      container.querySelector(`[data-testid="remove-${UPLOADED}"]`),
    ).not.toBeNull();
  });
});

describe('GalleryManager — a failed read', () => {
  it('says so instead of rendering an empty gallery', () => {
    // Six missing tiles and an outage look identical otherwise, and the empty
    // state would tell an owner to upload photos they may already have.
    act(() =>
      root.render(
        <GalleryManager
          businessId="550e8400-e29b-41d4-a716-446655440000"
          initialImages={[]}
          loadFailed
        />,
      ),
    );

    expect(container.textContent).toContain("couldn't load your gallery");
  });
});
