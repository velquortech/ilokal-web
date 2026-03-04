# Shared Components Guide

This document provides guidance on using the reusable shared components for the User Management tabs (Admin, Business Owner, and Consumer).

## Available Components

All components are located in `/app/dashboard/admin/users/components/shared/`:

### 1. **UserSearchFilter**

Search and filter component for user listings.

**Props:**

- `searchQuery: string` - Current search query
- `onSearchChange: (query: string) => void` - Callback when search changes
- `statusFilter: 'all' | 'active' | 'inactive' | 'suspended'` - Current status filter
- `onStatusFilterChange: (status: ...) => void` - Callback for status filter change
- `sortOrder: 'latest' | 'oldest'` - Current sort order
- `onSortOrderChange: (order: ...) => void` - Callback for sort order change
- `onReset: () => void` - Callback to reset all filters
- `hasActiveFilters: boolean` - Flag to show/hide reset button

**Example Usage:**

```tsx
import { UserSearchFilter } from '../../shared';

<UserSearchFilter
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  statusFilter={statusFilter}
  onStatusFilterChange={setStatusFilter}
  sortOrder={sortOrder}
  onSortOrderChange={setSortOrder}
  onReset={handleResetFilters}
  hasActiveFilters={hasActiveFilters}
/>;
```

### 2. **UsersTable**

Paginated table component for displaying users with actions (edit, delete).

**Props:**

- `data: PaginatedResponse<Profile> | null` - Paginated user data
- `isLoading: boolean` - Loading state
- `currentPage: number` - Current page number
- `onPageChange: (page: number) => void` - Pagination callback
- `onEdit: (user: Profile) => void` - Edit action callback
- `onDelete: (id: string) => void` - Delete action callback
- `onStatusChange?: (updatedUser: Profile) => void` - Status change callback
- `isSubmitting: boolean` - Submit state

**Example Usage:**

```tsx
import { UsersTable } from '../../shared';

<UsersTable
  data={usersData}
  isLoading={isLoading}
  currentPage={currentPage}
  onPageChange={setCurrentPage}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onStatusChange={handleStatusChange}
  isSubmitting={isSubmitting}
/>;
```

### 3. **UserEditForm**

Reusable form component for editing user profiles.

**Props:**

- `user: Profile` - User profile data to edit
- `onSubmit: (data: AdminEditFormData) => Promise<void>` - Submit callback
- `onCancel: () => void` - Cancel callback
- `isSubmitting: boolean` - Submit state
- `error?: string | null` - Error message to display
- `submitButtonLabel?: string` - Custom button label (default: "Update User")

**Example Usage:**

```tsx
import { UserEditForm } from '../../shared';

<UserEditForm
  user={selectedUser}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  isSubmitting={isSubmitting}
  error={error}
  submitButtonLabel="Update Business Owner"
/>;
```

## Implementation Pattern

Both `AdminTab` and future tabs (BusinessOwnerTab, ConsumerTab) should follow this pattern:

1. **State Management**: Manage filter, pagination, and form states
2. **Data Fetching**: Fetch data based on user role
3. **Filter/Sort Logic**: Apply client-side filtering and sorting
4. **Component Assembly**: Compose the shared components together

### Example Tab Implementation Structure:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { UsersTable, UserSearchFilter } from '../../shared';
import { UserFormModal } from '../../form';

export default function YourTab() {
  const [data, setData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('latest');
  // ... other state

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, searchQuery, statusFilter, sortOrder]);

  const fetchUsers = async (page) => {
    // Fetch data from API
    // Apply filters and sorting
  };

  return (
    <div className="space-y-4">
      <UserSearchFilter {...filterProps} />
      <UsersTable {...tableProps} />
      <UserFormModal {...formModalProps} />
    </div>
  );
}
```

## Next Steps

1. **BusinessOwnerTab**: Implement using the shared components
2. **ConsumerTab**: Implement using the shared components
3. Custom schema modifications if needed (different from admin edit schema)

## Key Design Decisions

✅ **Reusability**: Components are generic with generic names (`UserSearchFilter`, `UsersTable`, `UserEditForm`)

✅ **Naming**: Removed "Admin" prefix to indicate shared/reusable nature

✅ **Props**: Submit button label is customizable for different user types

✅ **Structure**: Organized in dedicated `shared/` folder for clear visibility

✅ **Exports**: All components exported from main index for easy access

## Notes

- The form components use the `adminEditSchema` from the schemas module. If different user types need different fields, create new schemas and adapt the form accordingly.
- The `UserEditForm` accepts `AdminEditFormData` - consider generalizing the schema if needed for other user types.
- All components handle loading and error states.
- Pagination is hardcoded to 10 items per page in `UsersTable` (can be made configurable if needed).
