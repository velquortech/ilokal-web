'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Branch } from '@/lib/types';

export interface BusinessShop {
  id: string;
  owner_id: string;
  shop_name: string;
  description: string;
  logo_url: string;
  banner_url: string;
  interior_images: string[];
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  business_category: {
    name: string;
    type: 'predefined' | 'custom';
    description?: string;
  };
  location: {
    province: string;
    city: string;
    barangay: string;
    street_address: string;
    zip_code: string;
    geometry: string;
  };
  verification_documents: {
    tax_certificate: string;
    business_license: string;
  };
}

interface BusinessContextType {
  business?: BusinessShop | null;
  branches: Branch[];
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
}

const businessContext = createContext<BusinessContextType | undefined>(
  undefined,
);

export function BusinessShopProvider({
  children,
  businessShop,
  branches = [],
}: {
  children: ReactNode;
  businessShop?: BusinessShop | null;
  branches?: Branch[];
}) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  return (
    <businessContext.Provider
      value={{
        business: businessShop,
        branches,
        selectedBranchId,
        setSelectedBranchId,
      }}
    >
      {children}
    </businessContext.Provider>
  );
}

export const useBusinessShop = () => {
  const context = useContext(businessContext);
  if (context === undefined) {
    throw new Error(
      'useBusinessShop must be used within a BusinessShopProvider',
    );
  }
  return context;
};

/**
 * The id of the shop currently being managed.
 *
 * Every business Server Action takes this as its first argument, because
 * `verifyBusinessOwner()` called with NO argument falls back to whichever shop
 * `.limit(1)` returns — so an owner holding two shops would act on the wrong
 * one. The layout resolves the shop from the `[businessId]` route segment, so
 * this is that segment's shop, already ownership-checked server-side.
 *
 * Returns `''` when the provider has no shop (the pre-registration state).
 * Callers must treat that as "not ready" rather than sending it: an empty id
 * fails `verifyBusinessOwner`'s UUID check and comes back as a
 * VALIDATION_ERROR, which is a confusing thing to show for "your shop has not
 * loaded yet".
 */
export const useBusinessId = (): string => {
  const { business } = useBusinessShop();
  return business?.id ?? '';
};
