/**
 * BusinessDocumentStats tests.
 * Pure presentational card grid for the admin Business Documents page. Tests run
 * in the node env (no DOM), so we invoke the component and inspect the returned
 * React element tree — asserting the count → card mapping and missing-key
 * defaulting.
 */

import { describe, it, expect } from 'vitest';
import type { ReactElement } from 'react';
import { Building2, Clock, CircleCheck, CircleX } from 'lucide-react';
import { BusinessDocumentStats } from '../business-document-stats';

interface StatCardProps {
  title: string;
  value: number;
  icon: unknown;
}

/** Pull the StatCard elements out of the grid wrapper. */
function cardsOf(counts: Record<string, number>): StatCardProps[] {
  const tree = BusinessDocumentStats({ counts }) as ReactElement<{
    children: ReactElement<StatCardProps>[];
  }>;
  return tree.props.children.map((el) => el.props);
}

describe('BusinessDocumentStats', () => {
  it('maps counts onto the four status cards in order', () => {
    const cards = cardsOf({
      pending: 3,
      verified: 7,
      suspended: 1,
      rejected: 2,
      total: 13,
    });

    expect(cards).toHaveLength(4);
    expect(cards.map((c) => [c.title, c.value])).toEqual([
      ['Total Businesses', 13],
      ['Pending', 3],
      ['Verified', 7],
      ['Rejected', 2],
    ]);
  });

  it('uses the correct icon per card', () => {
    const cards = cardsOf({});
    expect(cards.map((c) => c.icon)).toEqual([
      Building2,
      Clock,
      CircleCheck,
      CircleX,
    ]);
  });

  it('defaults missing counts to 0', () => {
    const cards = cardsOf({ verified: 5 });

    expect(cards.map((c) => c.value)).toEqual([0, 0, 5, 0]);
  });
});
