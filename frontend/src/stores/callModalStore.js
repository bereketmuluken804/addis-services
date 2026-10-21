import { create } from 'zustand';

export const useCallModalStore = create((set) => ({
  isOpen: false,
  provider: null,

  openCallModal: (provider) => set({ isOpen: true, provider }),
  closeCallModal: () => set({ isOpen: false, provider: null }),
}));
