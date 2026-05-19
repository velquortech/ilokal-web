'use client';

import * as React from 'react';
import { FolderOpen, Plus, Trash2, Search, Pen, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { catalogues as initialCatalogues } from '../../data/products';

export function ManageCatalogues() {
  const [isAdding, setIsAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus the input when "Add" is clicked
  React.useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAddCategory = () => {
    if (!newName.trim()) {
      setIsAdding(false);
      return;
    }
    console.info('Adding category:', newName);
    setNewName('');
    setIsAdding(false);
  };

  const handleStartEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleSaveEdit = () => {
    console.info('Updating category:', editingId, editValue);
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddCategory();
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewName('');
    }
  };

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          setIsAdding(false);
          setEditingId(null);
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FolderOpen className="size-4" />
          Manage Catalogues
        </Button>
      </SheetTrigger>

      <SheetContent
        className="flex w-full flex-col p-4 sm:max-w-md md:max-w-lg"
        showCloseButton={false}
      >
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-2xl">Catalogues</SheetTitle>
          <SheetDescription>
            Organize your products into categories. Changes are saved locally.
          </SheetDescription>
        </SheetHeader>

        {/* TOOLBAR */}
        <div className="flex items-center gap-2 pt-4">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input placeholder="Search categories..." className="pl-9" />
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* SCROLLABLE AREA */}
        <div className="mt-4 flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-3">
            <div className="space-y-2">
              {/* INLINE QUICK ADD INPUT */}
              {isAdding && (
                <div className="border-primary ring-ring/20 bg-muted/30 flex w-full items-center gap-1 rounded-md border py-2 pl-2 ring-2">
                  <Input
                    ref={inputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Category name..."
                    className="h-max border-none bg-transparent p-0 px-2 shadow-none focus-visible:ring-0"
                  />
                  <button
                    className="text-primary px-1"
                    onClick={handleAddCategory}
                  >
                    <Check className="size-4" />
                  </button>
                  <button
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

              {/* LIST ITEMS */}
              {initialCatalogues.map((cat) => (
                <div
                  key={cat.id}
                  className={`border-border group flex w-full items-center rounded-md border py-2 pr-1 transition-colors ${
                    editingId === cat.id
                      ? 'border-primary ring-ring/20 ring-2'
                      : 'bg-muted hover:bg-muted/50 pl-3'
                  }`}
                >
                  {editingId === cat.id ? (
                    <>
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="h-max border-none bg-transparent p-0 px-2 shadow-none focus-visible:ring-0"
                      />
                      <button
                        className="text-primary px-1"
                        onClick={handleSaveEdit}
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        className="text-muted-foreground px-1"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{cat.name}</span>
                      <div className="ml-auto hidden items-center gap-1 group-hover:flex">
                        <button
                          className="hover:text-primary ml-auto px-1 transition-colors"
                          onClick={() => handleStartEdit(cat.id, cat.name)}
                        >
                          <Pen className="size-4" />
                        </button>
                        <button className="text-destructive px-1 transition-opacity hover:opacity-70">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <span className="text-muted-foreground ml-auto block px-1 text-xs group-hover:hidden">
                        99 Products
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <SheetFooter className="mt-auto pt-6">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button type="submit">Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
