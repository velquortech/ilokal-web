import { getPendingBranchesAction } from '../actions/branchActions';
import { AdminBranchesClient } from './components/admin-branches-client';

export const dynamic = 'force-dynamic';

export default async function AdminBranchesPage() {
  const result = await getPendingBranchesAction();

  const branches = result.success ? (result.data?.branches ?? []) : [];

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Branch Applications
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and approve new branch location requests from business owners.
        </p>
      </div>
      <AdminBranchesClient branches={branches} />
    </div>
  );
}
