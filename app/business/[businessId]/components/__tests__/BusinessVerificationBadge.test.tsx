// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusinessVerificationBadge } from '../BusinessVerificationBadge';

describe('BusinessVerificationBadge', () => {
  it('renders nothing for an unknown or missing status', () => {
    const { container } = render(<BusinessVerificationBadge status={null} />);
    expect(container.innerHTML).toBe('');
    const { container: c2 } = render(
      <BusinessVerificationBadge status="weird" />,
    );
    expect(c2.innerHTML).toBe('');
  });

  it('labels every known status', () => {
    const { rerender } = render(
      <BusinessVerificationBadge status="verified" />,
    );
    expect(screen.getByText('Verified')).toBeTruthy();
    rerender(<BusinessVerificationBadge status="pending" />);
    expect(screen.getByText('Pending review')).toBeTruthy();
    rerender(<BusinessVerificationBadge status="rejected" />);
    expect(screen.getByText('Rejected')).toBeTruthy();
    rerender(<BusinessVerificationBadge status="suspended" />);
    expect(screen.getByText('Suspended')).toBeTruthy();
  });

  it('keeps the label as a title even when hidden on mobile', () => {
    render(<BusinessVerificationBadge status="verified" hideLabelOnMobile />);
    // The visible text is hidden below `sm`, but the title must stay so the
    // icon-only header badge is still discoverable (and the header keeps a
    // data-tour / tooltip-free affordance).
    expect(screen.getByTitle('Verified')).toBeTruthy();
  });
});
