import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { useSearchStore } from '@/stores/searchStore';

export function FilterContent({ onClose }) {
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const {
    categoryId,
    subCityId,
    availableOnly,
    searchTerm,
    setCategory,
    setSubCity,
    setAvailableOnly,
    setSearchTerm,
    resetFilters,
  } = useSearchStore();

  const subCities = locations[0]?.subCities || [];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-base font-bold text-foreground">Filter Providers</h3>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Keyword Search */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/80">
          Search by Name or Keyword
        </label>
        <input
          type="text"
          placeholder="e.g. plumber, Bole, Yeka..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Availability Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground/80">
          Availability
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/40">
          <span className="text-xs font-medium text-foreground">Available now only</span>
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
        </label>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground/80">
          Trade / Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              categoryId === null
                ? 'bg-primary text-primary-foreground shadow-subtle'
                : 'border border-border bg-card text-foreground/80 hover:bg-muted'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(categoryId === cat.id ? null : cat.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                categoryId === cat.id
                  ? 'bg-primary text-primary-foreground shadow-subtle'
                  : 'border border-border bg-card text-foreground/80 hover:bg-muted'
              }`}
            >
              {cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-city Filter */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground/80">
          Sub-City in Addis Ababa
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSubCity(null)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              subCityId === null
                ? 'bg-primary text-primary-foreground shadow-subtle'
                : 'border border-border bg-card text-foreground/80 hover:bg-muted'
            }`}
          >
            All Sub-Cities
          </button>
          {subCities.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSubCity(subCityId === sub.id ? null : sub.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                subCityId === sub.id
                  ? 'bg-primary text-primary-foreground shadow-subtle'
                  : 'border border-border bg-card text-foreground/80 hover:bg-muted'
              }`}
            >
              {sub.nameEn}
            </button>
          ))}
        </div>
      </div>

      {onClose && (
        <Button
          onClick={onClose}
          className="w-full h-9 rounded-lg text-xs font-semibold mt-4"
        >
          View Results
        </Button>
      )}
    </div>
  );
}

export function FilterDrawer({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-foreground/30 backdrop-blur-xs lg:hidden">
      <div className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4">
          <span className="font-heading text-base font-bold">Filters</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <FilterContent onClose={onClose} />
      </div>
    </div>
  );
}
