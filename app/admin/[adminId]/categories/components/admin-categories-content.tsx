'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { MobileCategoryCardList } from './mobile-category-card-list';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateShort } from '@/lib/utils/dateFormatter';
import type { Category } from '@/lib/types';
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from '../../actions/categoryActions';

/** Form spelling of the DB's NULL kind — a category offered for BOTH kinds. */
type KindChoice = 'product' | 'service' | 'either';

type BusinessTypeOption = { id: string; name: string };

const KIND_CHOICES: { value: KindChoice; label: string; hint: string }[] = [
  {
    value: 'product',
    label: 'Product',
    hint: 'Only offered when a shop adds a product.',
  },
  {
    value: 'service',
    label: 'Service',
    hint: 'Only offered when a shop adds a service.',
  },
  {
    value: 'either',
    label: 'Either',
    hint: 'Offered for both — the default.',
  },
];

function kindLabel(kind: Category['kind']): string {
  if (kind === 'product') return 'Product';
  if (kind === 'service') return 'Service';
  return 'Either';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toPayload(form: CategoryFormState) {
  return {
    name: form.name.trim(),
    slug: slugify(form.slug),
    description: form.description.trim() || undefined,
    kind: form.kind === 'either' ? null : form.kind,
    // 'global' is the form's "Global" (null) choice. Radix Select rejects an
    // empty-string item value, so the sentinel cannot be ''.
    business_type_id:
      form.businessTypeId === 'global' ? null : form.businessTypeId,
  };
}

type CategoryFormState = {
  name: string;
  slug: string;
  description: string;
  kind: KindChoice;
  /** 'global' = Global (NULL); otherwise a business-type id. */
  businessTypeId: string;
};

function emptyForm(): CategoryFormState {
  return {
    name: '',
    slug: '',
    description: '',
    kind: 'either',
    businessTypeId: 'global',
  };
}

function formFromCategory(category: Category): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    kind: category.kind ?? 'either',
    businessTypeId: category.business_type_id ?? 'global',
  };
}

/** Create/Edit dialog — one form, two submit targets. */
function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  businessTypes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  businessTypes: BusinessTypeOption[];
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<CategoryFormState>(emptyForm);
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset the form each time the dialog opens for a different target.
  React.useEffect(() => {
    if (open) {
      setForm(category ? formFromCategory(category) : emptyForm());
      // An existing category's slug is stored and referenced (URLs, the
      // mobile filter) — never re-derive it from a renamed display name.
      setSlugTouched(!!category);
      setError(null);
    }
  }, [open, category]);

  const update = (patch: Partial<CategoryFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const onNameChange = (name: string) => {
    update({
      name,
      // Derive the slug from the name until the admin types their own — a
      // helpful default for a brand-new category, never an override. The
      // slug field stays "derived" (not touched) so it tracks the full name,
      // not just the first keystroke.
      ...(!slugTouched && { slug: slugify(name) }),
    });
  };

  const submit = async () => {
    const name = form.name.trim();
    const slug = slugify(form.slug);
    if (!name) {
      setError('Category name is required.');
      return;
    }
    if (!slug) {
      setError('Category slug is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = toPayload(form);
      const res = category
        ? await updateCategoryAction(category.id, payload)
        : await createCategoryAction(payload);
      if (!res.success) {
        setError(res.error?.message ?? 'Could not save the category.');
        return;
      }
      toast.success(category ? 'Category updated.' : 'Category created.');
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Add Category'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? 'Update the name, slug, description or kind.'
              : 'A category is offered to shops by vertical and by kind.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <Field>
            <FieldLabel htmlFor="cat-name">Name</FieldLabel>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Food & Beverage"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="cat-slug">Slug</FieldLabel>
            <Input
              id="cat-slug"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update({ slug: e.target.value });
              }}
              placeholder="e.g. food-beverages"
            />
            <FieldDescription>
              Stable identifier used in URLs and the mobile filter. Lowercase
              with hyphens.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="cat-description">Description</FieldLabel>
            <Input
              id="cat-description"
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Optional — what belongs here?"
            />
          </Field>{' '}
          <Field>
            <FieldLabel htmlFor="cat-kind">Kind</FieldLabel>
            <Select
              value={form.kind}
              onValueChange={(value) => update({ kind: value as KindChoice })}
            >
              <SelectTrigger id="cat-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_CHOICES.map((choice) => (
                  <SelectItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {KIND_CHOICES.find((choice) => choice.value === form.kind)?.hint}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="cat-type">Business Type</FieldLabel>
            {/* Searchable so an admin with many verticals can type to find
                one instead of scrolling the list; the search box is keyboard
                navigable (↑/↓ + Enter), the same pick pattern as the
                registration wizard's category search. */}
            <SearchableSelect
              id="cat-type"
              options={[{ id: 'global', name: 'Global' }, ...businessTypes]}
              value={form.businessTypeId}
              onChange={(value) => update({ businessTypeId: value })}
              getLabel={(option) => option.name}
              getValue={(option) => option.id}
              placeholder="Select a business type..."
              searchPlaceholder="Search business types..."
              emptyMessage="No business types match your search."
            />
            <FieldDescription>
              {form.businessTypeId === 'global'
                ? 'Global — shown in every business type’s category picker.'
                : `Pinned — only ${businessTypes.find((t) => t.id === form.businessTypeId)?.name ?? 'this business type'} sees it.`}
            </FieldDescription>
          </Field>
          {error && <FieldError>{error}</FieldError>}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting} aria-busy={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : category ? (
              'Save Changes'
            ) : (
              'Create Category'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Delete confirm — separate from the form so a blocked delete (in-use
 *  category) surfaces as its own dialog rather than inside the form. */
function DeleteCategoryDialog({
  category,
  onClose,
  onDeleted,
}: {
  category: Category | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  const confirm = async () => {
    if (!category) return;
    setSubmitting(true);
    try {
      const res = await deleteCategoryAction(category.id);
      if (!res.success) {
        toast.error(res.error?.message ?? 'Could not delete the category.');
        return;
      }
      toast.success('Category deleted.');
      onDeleted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent role="alertdialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold">{category?.name}</span>? Categories
            still attached to offerings cannot be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete Category'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PAGE_SIZE = 10;

export function AdminCategoriesContent({
  categories,
  businessTypes,
  loadFailed,
}: {
  categories: Category[];
  businessTypes: BusinessTypeOption[];
  loadFailed: boolean;
}) {
  const router = useRouter();
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Category | null>(null);

  const sorted = React.useMemo(() => {
    const rows = [...categories];
    const sort = sorting[0];
    if (!sort) return rows;
    const dir = sort.desc ? -1 : 1;
    return rows.sort((a, b) => {
      const av = String(a[sort.id as keyof Category] ?? '').toLowerCase();
      const bv = String(b[sort.id as keyof Category] ?? '').toLowerCase();
      return av.localeCompare(bv) * dir;
    });
  }, [categories, sorting]);

  const typeName = React.useCallback(
    (id?: string | null) =>
      id ? (businessTypes.find((t) => t.id === id)?.name ?? '—') : 'Global',
    [businessTypes],
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / pagination.pageSize));
  const pageRows = sorted.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize,
  );

  const refresh = () => {
    setCreating(false);
    setEditing(null);
    setDeleting(null);
    router.refresh();
  };

  const columns: ColumnDef<Category>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ row }) => (
          <code className="text-muted-foreground text-xs">
            {row.original.slug}
          </code>
        ),
      },
      {
        accessorKey: 'kind',
        header: 'Kind',
        cell: ({ row }) => (
          <Badge variant={row.original.kind ? 'default' : 'outline'}>
            {kindLabel(row.original.kind)}
          </Badge>
        ),
      },
      {
        accessorKey: 'business_type_id',
        header: 'Business Type',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {typeName(row.original.business_type_id)}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {formatDateShort(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-touch"
              onClick={() => setEditing(row.original)}
              aria-label={`Edit ${row.original.name}`}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-touch"
              onClick={() => setDeleting(row.original)}
              aria-label={`Delete ${row.original.name}`}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [typeName],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={pageRows}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={(updater) => {
          setPagination(
            typeof updater === 'function' ? updater(pagination) : updater,
          );
        }}
        sorting={sorting}
        onSortingChange={setSorting}
        renderMobile={(table) => <MobileCategoryCardList table={table} />}
        toolbar={
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              {categories.length} categor
              {categories.length === 1 ? 'y' : 'ies'}
            </p>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Add Category
            </Button>
          </div>
        }
        emptyState={
          loadFailed
            ? 'Could not load categories. Refresh to try again.'
            : 'No categories yet. Add one to get started.'
        }
      />

      <CategoryFormDialog
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        category={editing}
        businessTypes={businessTypes}
        onSaved={refresh}
      />

      <DeleteCategoryDialog
        category={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={refresh}
      />
    </>
  );
}
