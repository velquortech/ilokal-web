import { Smartphone } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RegistrationFunnel } from '@/lib/types';
import { FUNNEL_STEPS, funnelShare } from '@/lib/utils/registrationFunnel';

/**
 * The mobile app's "List your business" link, step by step.
 *
 * Written for whoever opens the dashboard, not whoever wrote the query: plain
 * step names, each step as a share of the one before it so the drop-off reads
 * at a glance, then the same numbers per place in the app. A broken read and an
 * empty month each say so in words — never as a row of zeros.
 */
export function RegistrationFunnelCard({
  funnel,
}: {
  funnel: RegistrationFunnel;
}) {
  const { days, sources, totals, failed } = funnel;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Shops from the iLokal app</CardTitle>
          <CardDescription>
            Owners who tapped “List your business” in the mobile app — last{' '}
            {days} days
          </CardDescription>
        </div>
        <Smartphone className="text-muted-foreground h-4 w-4" />
      </CardHeader>

      <CardContent>
        {failed ? (
          <p className="text-muted-foreground text-sm">
            We couldn’t load the app sign-up numbers. Refresh in a moment rather
            than acting on them.
          </p>
        ) : sources.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No one has opened the app’s “List your business” link in the last{' '}
            {days} days.
          </p>
        ) : (
          <div className="space-y-6">
            <ol className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {FUNNEL_STEPS.map((step, i) => {
                const value = totals[step.key];
                const pct =
                  i > 0
                    ? funnelShare(value, totals[FUNNEL_STEPS[i - 1].key])
                    : null;
                return (
                  <li key={step.key} className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">
                      {step.label}
                    </p>
                    <p className="text-2xl font-bold">
                      {value.toLocaleString()}
                    </p>
                    {pct && (
                      <p className="text-muted-foreground text-xs">
                        {pct} {step.ofPrevious}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Where in the app</TableHead>
                  {FUNNEL_STEPS.map((step) => (
                    <TableHead key={step.key} className="text-right">
                      {step.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.ref}>
                    <TableCell className="font-medium">
                      {source.label}
                    </TableCell>
                    {FUNNEL_STEPS.map((step) => (
                      <TableCell key={step.key} className="text-right">
                        {source[step.key].toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
