import { create } from 'zustand';

interface StatusUpdateState {
  updatingId: string | null;
  setUpdatingId: (id: string | null) => void;
  isUpdating: (id: string) => boolean;
}

export const useAdminStore = create<StatusUpdateState>((set, get) => ({
  updatingId: null,
  setUpdatingId: (id) => set({ updatingId: id }),
  isUpdating: (id) => get().updatingId === id,
}));
