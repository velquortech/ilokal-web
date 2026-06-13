import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Archive, Clock } from 'lucide-react';

interface StatusCardsProps {
  counts: {
    active: number;
    archived: number;
    suspended: number;
    inactive: number;
  };
  loading: boolean;
}

export function StatusCards({ counts, loading }: StatusCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
          <AlertCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '-' : counts.active}
          </div>
          <p className="text-muted-foreground text-xs">Active accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Archived</CardTitle>
          <Archive className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '-' : counts.archived}
          </div>
          <p className="text-muted-foreground text-xs">Soft deleted accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Suspended</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '-' : counts.suspended}
          </div>
          <p className="text-muted-foreground text-xs">Admin suspended</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          <Clock className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '-' : counts.inactive}
          </div>
          <p className="text-muted-foreground text-xs">Disabled accounts</p>
        </CardContent>
      </Card>
    </div>
  );
}
