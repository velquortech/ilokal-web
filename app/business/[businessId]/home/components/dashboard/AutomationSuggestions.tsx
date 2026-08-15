import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { businessCouponsPath } from '@/config/routeConfig';
import type { AutomationSuggestion } from '@/lib/types';

interface AutomationSuggestionsProps {
  suggestions: AutomationSuggestion[];
  /** Needed for the empty-state CTA (\"Add your first deal\"). */
  businessId: string;
}

const SEVERITY_CONFIG = {
  info: {
    Icon: Lightbulb,
    className: 'bg-blue-50 border-blue-100 text-blue-800',
    iconClassName: 'text-blue-500',
  },
  warning: {
    Icon: AlertTriangle,
    className: 'bg-amber-50 border-amber-100 text-amber-800',
    iconClassName: 'text-amber-500',
  },
  success: {
    Icon: CheckCircle,
    className: 'bg-green-50 border-green-100 text-green-800',
    iconClassName: 'text-green-500',
  },
} as const;

export function AutomationSuggestions({
  suggestions,
  businessId,
}: AutomationSuggestionsProps) {
  // An empty suggestions list is a first-day shop, not a broken one — say what
  // to do instead of leaving the card as dead space.
  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Smart Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Sparkles className="text-muted-foreground size-4 shrink-0" />
              Add your first deal and suggestions will start appearing here.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={businessCouponsPath(businessId)}>Create a deal</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Smart Suggestions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => {
          const { Icon, className, iconClassName } =
            SEVERITY_CONFIG[suggestion.severity];

          return (
            <div
              key={suggestion.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-sm',
                className,
              )}
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', iconClassName)} />
              <p>{suggestion.message}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
