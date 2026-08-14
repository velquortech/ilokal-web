import Link from 'next/link';
import { Lock, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routeConfig';

export default function LockedAnalyticsCard() {
  return (
    <Card className="border-border bg-card relative overflow-hidden">
      <div className="bg-background/60 absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-[2px]">
        <div className="bg-background ring-border flex h-12 w-12 items-center justify-center rounded-full shadow-sm ring-1">
          <Lock className="text-muted-foreground h-5 w-5" />
        </div>
      </div>

      <CardHeader className="pb-2 opacity-40">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="flex items-center gap-1 font-medium"
          >
            <TrendingUp className="h-3 w-3" />
            Analytics
          </Badge>
          <Sparkles className="text-muted h-4 w-4" />
        </div>
        <CardTitle className="text-lg">Real-time Insights</CardTitle>
      </CardHeader>

      <CardContent className="relative z-20 space-y-4 pt-4">
        <div className="space-y-1">
          <h4 className="text-primary text-sm font-bold">Almost There!</h4>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Finish your registration to unlock real-time sales data and growth
            analytics.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={ROUTES.BUSINESS.registration}>
            Register your shop
            <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
