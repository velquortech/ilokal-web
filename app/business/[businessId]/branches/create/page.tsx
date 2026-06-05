import { BranchFormProvider } from './provider/branch-form-provider';
import { BranchCreateContent } from './components/branch-create-content';

export default function BranchCreatePage() {
  return (
    <div className="flex h-full w-full">
      <BranchFormProvider>
        <BranchCreateContent />
      </BranchFormProvider>
    </div>
  );
}
