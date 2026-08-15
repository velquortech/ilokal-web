// @vitest-environment happy-dom

/**
 * BusinessVerificationBadge — the four status arms and the mobile label
 * behavior. Rendered with react-dom/client + happy-dom (the repo's component
 * test pattern — see UserMenu.test.tsx); `@testing-library/react` is declared
 * but its `@testing-library/dom` peer is not installed on a clean CI install,
 * so RTL's `render` fails there.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BusinessVerificationBadge } from '../BusinessVerificationBadge';

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
});

function renderBadge(props: {
  status?: string | null;
  hideLabelOnMobile?: boolean;
}) {
  act(() => {
    root.render(
      <BusinessVerificationBadge
        status={props.status}
        hideLabelOnMobile={props.hideLabelOnMobile}
      />,
    );
  });
  return container;
}

describe('BusinessVerificationBadge', () => {
  it('renders nothing for an unknown or missing status', () => {
    renderBadge({ status: null });
    expect(container.innerHTML).toBe('');
    renderBadge({ status: 'weird' });
    expect(container.innerHTML).toBe('');
  });

  it('labels every known status', () => {
    renderBadge({ status: 'verified' });
    expect(container.textContent).toContain('Verified');
    renderBadge({ status: 'pending' });
    expect(container.textContent).toContain('Pending review');
    renderBadge({ status: 'rejected' });
    expect(container.textContent).toContain('Rejected');
    renderBadge({ status: 'suspended' });
    expect(container.textContent).toContain('Suspended');
  });

  it('keeps the label as a title even when hidden on mobile', () => {
    renderBadge({ status: 'verified', hideLabelOnMobile: true });
    const span = container.querySelector('span')!;
    expect(span.getAttribute('title')).toBe('Verified');
    // The label text itself is hidden below `sm` — the title carries it.
    expect(span.querySelector('.hidden')).toBeTruthy();
  });
});
