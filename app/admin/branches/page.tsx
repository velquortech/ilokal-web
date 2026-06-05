import { getPendingBranchesAction } from '../actions/branchActions';
import { AdminBranchesClient } from './components/admin-branches-client';

export const dynamic = 'force-dynamic';

export default async function AdminBranchesPage() {
  const result = await getPendingBranchesAction();

  const branches = result.success ? (result.data?.branches ?? []) : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Branch Applications</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review and approve new branch location requests from business owners.
        </p>
      </div>
      <AdminBranchesClient branches={branches} />
    </div>
  );
}
