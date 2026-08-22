'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export type FollowUpTab = 'registration' | 'menu';

/**
 * The two follow-up cohorts on one page.
 *
 * 🔴 The active tab lives in the URL, not in component state. Both tables write
 * their page/search into the query string, so an uncontrolled `Tabs` would snap
 * back to its default the moment an admin paged the second tab. It also makes a
 * tab linkable, which matters when someone is asked to "look at the 20".
 *
 * Registration leads: it is the larger and earlier leak (49% of owner accounts
 * never produce a shop, versus a menuless shop that is at least listed).
 */
export function FollowUpTabs({
  active,
  registrationCount,
  menuCount,
  registrationPanel,
  menuPanel,
}: {
  active: FollowUpTab;
  registrationCount: number;
  menuCount: number;
  registrationPanel: React.ReactNode;
  menuPanel: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const select = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // 'registration' is the default, so it stays out of the URL.
    if (value === 'registration') params.delete('tab');
    else params.set('tab', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <Tabs value={active} onValueChange={select} className="w-full">
      <TabsList>
        <TabsTrigger value="registration" className="gap-2">
          Incomplete registration
          {registrationCount > 0 && (
            <Badge variant="secondary">{registrationCount}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="menu" className="gap-2">
          Missing menu
          {menuCount > 0 && <Badge variant="secondary">{menuCount}</Badge>}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="registration" className="mt-4 space-y-6">
        {registrationPanel}
      </TabsContent>
      <TabsContent value="menu" className="mt-4 space-y-6">
        {menuPanel}
      </TabsContent>
    </Tabs>
  );
}
