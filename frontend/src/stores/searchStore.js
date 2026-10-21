import { create } from 'zustand';

export const useSearchStore = create((set) => ({
  searchTerm: '',
  categoryId: null,
  subCityId: null,
  availableOnly: false,
  sortBy: 'rating',
  page: 1,
  limit: 12,

  setSearchTerm: (searchTerm) => set({ searchTerm, page: 1 }),
  setCategory: (categoryId) => set({ categoryId, page: 1 }),
  setSubCity: (subCityId) => set({ subCityId, page: 1 }),
  setAvailableOnly: (availableOnly) => set({ availableOnly, page: 1 }),
  setSortBy: (sortBy) => set({ sortBy, page: 1 }),
  setPage: (page) => set({ page }),

  setFilters: (filters) => set((state) => ({ ...state, ...filters, page: 1 })),
  resetFilters: () =>
    set({
      searchTerm: '',
      categoryId: null,
      subCityId: null,
      availableOnly: false,
      sortBy: 'rating',
      page: 1,
    }),
}));
