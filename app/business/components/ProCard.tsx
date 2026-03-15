import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Gem } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function ProCard() {
  const { state } = useSidebar();
  return (
    <Card className={cn('text-sm', state === 'expanded' ? 'flex' : 'hidden')}>
      <CardHeader>
        <CardTitle>Upgrade to PRO plan</CardTitle>
        <CardDescription>
          Pro unlocks all features and remove limit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress />
        <Button className="w-full">
          <Gem /> Upgrade now
        </Button>
      </CardContent>
    </Card>
  );
}
