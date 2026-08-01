'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Check,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Loader2,
  Pen,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import {
  archiveSectionAction,
  createSectionAction,
  renameSectionAction,
  reorderSectionsAction,
} from '../../actions/sectionActions';
import {
  MAX_SECTIONS_PER_SHOP,
  MAX_SECTION_NAME_LENGTH,
  type ProductSectionWithCount,
} from '@/lib/types';

/**
 * The owner's own grouping of their offerings.
 *
 * Replaces a drawer whose buttons did nothing. Two rules it is built on:
 *
 * 1. **Every edit saves on the spot.** The old version had Cancel / Save
 *    Changes around a list of single-row edits, which can only ever lose work
 *    — close the sheet and the rename evaporates. There is no draft state here.
 * 2. **These are SECTIONS, not categories.** `categories` is the platform
 *    taxonomy an admin curates for discovery; this is one shop's menu. See
 *    `.claude/CATALOGUES.md`.
 */
export function ManageSections({
  businessId,
  sections,
  uncategorisedCount,
  loadFailed = false,
}: {
  businessId: string;
  sections: ProductSectionWithCount[];
  uncategorisedCount: number;
  loadFailed?: boolean;
}) {
  const router = useRouter();
  const vocabulary = useOfferingVocabulary();

  const [isAdding, setIsAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] =
    React.useState<ProductSectionWithCount | null>(null);
  const addInputRef = React.useRef<HTMLInputElement>(null);

  const atCap = sections.length >= MAX_SECTIONS_PER_SHOP;
  const busy = pendingId !== null;

  React.useEffect(() => {
    if (isAdding) addInputRef.current?.focus();
  }, [isAdding]);

  /**
   * One place that runs an action, reports it and refreshes. Server Actions
   * reject on a network fault as well as resolving with `success: false`, and
   * without the catch a rejection leaves the row spinning forever.
   */
  const run = async (
    key: string,
    label: string,
    action: () => Promise<{ success: boolean; error?: { message: string } }>,
  ): Promise<boolean> => {
    setPendingId(key);
    const toastId = `section-${key}`;
    try {
      const result = await action();
      if (!result.success) {
        toast.error(result.error?.message ?? 'Something went wrong.', {
          id: toastId,
        });
        return false;
      }
      toast.success(label, { id: toastId });
      router.refresh();
      return true;
    } catch (err) {
      console.error('[ManageSections]', err);
      toast.error('Something went wrong — please try again.', { id: toastId });
      return false;
    } finally {
      setPendingId(null);
    }
  };

  // Each handler closes its editor ONLY on success. A rejected duplicate name
  // has to stay on screen with the text intact — closing the row would throw
  // away what the owner typed and leave them guessing what went wrong.
  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      setIsAdding(false);
      return;
    }
    const ok = await run('new', `“${name}” added`, () =>
      createSectionAction(businessId, name),
    );
    if (ok) {
      setNewName('');
      setIsAdding(false);
    }
  };

  const handleRename = async (id: string) => {
    const name = editValue.trim();
    if (!name) return;
    const ok = await run(id, 'Section renamed', () =>
      renameSectionAction(businessId, id, name),
    );
    if (ok) setEditingId(null);
  };

  const handleArchive = async (section: ProductSectionWithCount) => {
    setConfirmArchive(null);
    await run(section.id, `“${section.name}” removed`, () =>
      archiveSectionAction(businessId, section.id),
    );
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const ids = sections.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(sections[index].id, 'Order saved', () =>
      reorderSectionsAction(businessId, ids),
    );
  };

  return (
    <>
      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            setIsAdding(false);
            setEditingId(null);
            setNewName('');
          }
        }}
      >
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FolderOpen className="size-4" />
            Sections
          </Button>
        </SheetTrigger>

        <SheetContent className="flex w-full flex-col gap-0 p-4 sm:max-w-md md:max-w-lg">
          <SheetHeader className="space-y-1 p-0">
            <SheetTitle className="font-display text-2xl font-bold tracking-tight">
              Sections
            </SheetTitle>
            <SheetDescription>
              Group your {vocabulary.plural.toLowerCase()} the way your shop
              does. Customers see these headings on your page. Every change
              saves right away.
            </SheetDescription>
          </SheetHeader>

          <div className="flex items-center justify-between gap-2 pt-4">
            <p className="text-muted-foreground text-xs">
              {sections.length} of {MAX_SECTIONS_PER_SHOP} used
            </p>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setIsAdding(true)}
              disabled={isAdding || atCap || busy || loadFailed}
            >
              <Plus className="h-4 w-4" />
              Add section
            </Button>
          </div>

          {atCap && (
            <p className="text-muted-foreground pt-2 text-xs">
              You have reached the limit. Remove one to add another.
            </p>
          )}

          <div className="mt-4 min-h-0 flex-1">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-2">
                {isAdding && (
                  <div className="border-primary ring-ring/20 bg-muted/30 flex w-full items-center gap-1 rounded-md border py-2 pl-2 ring-2">
                    <Input
                      ref={addInputRef}
                      value={newName}
                      maxLength={MAX_SECTION_NAME_LENGTH}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleAdd();
                        if (e.key === 'Escape') {
                          setIsAdding(false);
                          setNewName('');
                        }
                      }}
                      placeholder="e.g. Hot drinks"
                      aria-label="New section name"
                      className="h-max border-none bg-transparent p-0 px-2 shadow-none focus-visible:ring-0"
                    />
                    <button
                      type="button"
                      aria-label="Save new section"
                      className="text-primary px-1 disabled:opacity-50"
                      onClick={() => void handleAdd()}
                      disabled={pendingId === 'new'}
                    >
                      {pendingId === 'new' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel new section"
                      className="text-muted-foreground px-1"
                      onClick={() => {
                        setIsAdding(false);
                        setNewName('');
                      }}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}

                {loadFailed && (
                  <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
                    Couldn&apos;t load your sections right now — please refresh
                    to try again.
                  </p>
                )}

                {!loadFailed && sections.length === 0 && !isAdding && (
                  <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
                    No sections yet. Everything sits under Uncategorised.
                  </p>
                )}

                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`border-border group flex w-full items-center gap-1 rounded-md border py-2 pr-1 transition-colors ${
                      editingId === section.id
                        ? 'border-primary ring-ring/20 pl-2 ring-2'
                        : 'bg-muted hover:bg-muted/50 pl-3'
                    }`}
                  >
                    {editingId === section.id ? (
                      <>
                        <Input
                          autoFocus
                          value={editValue}
                          maxLength={MAX_SECTION_NAME_LENGTH}
                          aria-label={`Rename ${section.name}`}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter')
                              void handleRename(section.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-max border-none bg-transparent p-0 px-2 shadow-none focus-visible:ring-0"
                        />
                        <button
                          type="button"
                          aria-label="Save name"
                          className="text-primary px-1 disabled:opacity-50"
                          onClick={() => void handleRename(section.id)}
                          disabled={pendingId === section.id}
                        >
                          {pendingId === section.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel rename"
                          className="text-muted-foreground px-1"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="truncate text-sm font-medium">
                          {section.name}
                        </span>

                        <span className="text-muted-foreground ml-auto shrink-0 px-1 text-xs">
                          {section.product_count}{' '}
                          {section.product_count === 1
                            ? vocabulary.singular.toLowerCase()
                            : vocabulary.plural.toLowerCase()}
                        </span>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            aria-label={`Move ${section.name} up`}
                            className="hover:text-primary px-1 transition-colors disabled:opacity-30"
                            onClick={() => void move(index, -1)}
                            disabled={index === 0 || busy}
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${section.name} down`}
                            className="hover:text-primary px-1 transition-colors disabled:opacity-30"
                            onClick={() => void move(index, 1)}
                            disabled={index === sections.length - 1 || busy}
                          >
                            <ChevronDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Rename ${section.name}`}
                            className="hover:text-primary px-1 transition-colors"
                            onClick={() => {
                              setEditingId(section.id);
                              setEditValue(section.name);
                            }}
                          >
                            <Pen className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${section.name}`}
                            className="text-destructive px-1 transition-opacity hover:opacity-70 disabled:opacity-30"
                            onClick={() => setConfirmArchive(section)}
                            disabled={busy}
                          >
                            {pendingId === section.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Not a row you can edit — it is where everything without a
                    section lives, and the owner needs to know it exists. */}
                <div className="text-muted-foreground flex w-full items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm">
                  <span>Uncategorised</span>
                  <span className="text-xs">
                    {uncategorisedCount}{' '}
                    {uncategorisedCount === 1
                      ? vocabulary.singular.toLowerCase()
                      : vocabulary.plural.toLowerCase()}
                  </span>
                </div>
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* shadcn's alert-dialog primitive is not installed and the stack is
          frozen, so this is the repo's own Dialog — same pattern as
          delete-product.tsx. */}
      <Dialog
        open={confirmArchive !== null}
        onOpenChange={(open: boolean) => !open && setConfirmArchive(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove “{confirmArchive?.name}”?</DialogTitle>
            <DialogDescription>
              {confirmArchive?.product_count
                ? `Its ${confirmArchive.product_count} ${
                    confirmArchive.product_count === 1
                      ? vocabulary.singular.toLowerCase()
                      : vocabulary.plural.toLowerCase()
                  } stay in your catalogue and move to Uncategorised. Nothing is deleted.`
                : 'This section is empty, so nothing else changes.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep it</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() =>
                confirmArchive && void handleArchive(confirmArchive)
              }
            >
              Remove section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
