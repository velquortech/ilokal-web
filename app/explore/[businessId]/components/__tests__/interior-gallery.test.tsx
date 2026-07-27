// @vitest-environment happy-dom

/**
 * "Inside the shop" gallery — the tile grid and its lightbox handoff.
 *
 * Driven with `react-dom/client` + happy-dom (repo pattern; @testing-library's
 * peer isn't installed and the stack is frozen).
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteriorGallery } from '../interior-gallery';

// next/image needs a plain <img> in this environment.
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

let container: HTMLDivElement;
let root: Root;

function render(ui: React.ReactElement) {
  act(() => {
    root.render(ui);
  });
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

const IMAGES = [
  'https://cdn.test/a.jpg',
  'https://cdn.test/b.jpg',
  'https://cdn.test/c.jpg',
  'https://cdn.test/d.jpg',
  'https://cdn.test/e.jpg',
  'https://cdn.test/f.jpg',
];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('InteriorGallery', () => {
  it('renders nothing when the shop has no interior images', () => {
    render(<InteriorGallery images={[]} shopName="Test Cafe" />);
    expect(container.textContent).toBe('');
  });

  it('shows at most four tiles', () => {
    render(<InteriorGallery images={IMAGES} shopName="Test Cafe" />);
    expect(container.querySelectorAll('button').length).toBe(4);
  });

  it('surfaces the hidden images as a "+N more" overlay', () => {
    // Six images, four tiles — the other two must not vanish silently.
    render(<InteriorGallery images={IMAGES} shopName="Test Cafe" />);
    expect(container.textContent).toContain('+2 more');
  });

  it('has no overlay when every image is already visible', () => {
    render(
      <InteriorGallery images={IMAGES.slice(0, 4)} shopName="Test Cafe" />,
    );
    expect(container.textContent).not.toContain('more');
  });

  it('works with fewer than four images (Masonry refuses these)', () => {
    render(
      <InteriorGallery images={IMAGES.slice(0, 2)} shopName="Test Cafe" />,
    );
    expect(container.querySelectorAll('button').length).toBe(2);
  });

  it('opens the lightbox at the clicked tile', () => {
    render(<InteriorGallery images={IMAGES} shopName="Test Cafe" />);
    const tiles = container.querySelectorAll('button');

    click(tiles[1]);

    // The dialog portals outside the container.
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Test Cafe interior 2');
  });

  it('opens at the first HIDDEN image when the overlay tile is clicked', () => {
    // "+2 more" promises the images you cannot see — index 4, not index 3.
    render(<InteriorGallery images={IMAGES} shopName="Test Cafe" />);
    const tiles = container.querySelectorAll('button');

    click(tiles[3]);

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Test Cafe interior 5');
  });

  it('labels tiles for assistive tech', () => {
    render(<InteriorGallery images={IMAGES} shopName="Test Cafe" />);
    const tiles = container.querySelectorAll('button');

    expect(tiles[0].getAttribute('aria-label')).toBe('Open photo 1 of 6');
    expect(tiles[3].getAttribute('aria-label')).toBe('View all 6 photos');
  });
});
