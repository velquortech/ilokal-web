'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import {
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

type GlobalSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * Sidebar search field. Filters the nav via the lifted `value`/`onChange` in
 * the parent sidebar (see `filterNavSections`).
 *
 * - Expanded: a labelled searchbox with a leading icon and a clear (✕) control.
 * - Collapsed (icon mode, desktop): the input is hidden and only a search icon
 *   button shows — clicking it expands the sidebar and focuses the field.
 */
export function GlobalSearch({
  value,
  onChange,
  placeholder = 'Search here...',
}: GlobalSearchProps) {
  const { state, isMobile, setOpen } = useSidebar();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pendingFocus = React.useRef(false);

  const collapsed = state === 'collapsed' && !isMobile;

  // The input isn't mounted while collapsed, so focus has to wait until the
  // sidebar re-renders expanded after the icon button opens it.
  React.useEffect(() => {
    if (!collapsed && pendingFocus.current) {
      pendingFocus.current = false;
      inputRef.current?.focus();
    }
  }, [collapsed]);

  if (collapsed) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Search"
            aria-label="Open search"
            onClick={() => {
              pendingFocus.current = true;
              setOpen(true);
            }}
          >
            <Search />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <div className="relative flex items-center">
      <Search className="text-muted-foreground pointer-events-none absolute left-3 h-4 w-4" />
      <SidebarInput
        ref={inputRef}
        type="search"
        role="searchbox"
        aria-label="Search menu"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-muted h-9 border-0 pr-8 pl-9 focus-visible:ring-1 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="text-muted-foreground hover:text-foreground absolute right-2 flex h-5 w-5 items-center justify-center rounded-sm"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
