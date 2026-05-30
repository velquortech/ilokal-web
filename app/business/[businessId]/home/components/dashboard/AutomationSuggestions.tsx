import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutomationSuggestion } from '@/lib/types';

interface AutomationSuggestionsProps {
  suggestions: AutomationSuggestion[];
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
}: AutomationSuggestionsProps) {
  if (suggestions.length === 0) return null;

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
