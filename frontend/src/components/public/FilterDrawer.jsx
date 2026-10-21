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
    <div className="flex flex-col space-y-7 p-1">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-bold text-foreground">Filters</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset All
        </Button>
      </div>

      {/* Keyword Search */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Keyword Search
        </label>
        <input
          type="text"
          placeholder="e.g. plumber, Bole, electrical..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Availability Filter */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Availability Status
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3.5 transition-colors hover:bg-muted/50">
          <span className="text-sm font-semibold text-foreground">Show Available Pros Only</span>
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
          />
        </label>
      </div>

      {/* Category Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Service Category
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              categoryId === null
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'border border-border bg-card text-foreground/80 hover:bg-muted'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(categoryId === cat.id ? null : cat.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                categoryId === cat.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-border bg-card text-foreground/80 hover:bg-muted'
              }`}
            >
              {cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-city Location Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Addis Ababa Sub-city
        </label>
        <select
          value={subCityId || ''}
          onChange={(e) => setSubCity(e.target.value ? Number(e.target.value) : null)}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm font-medium outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">All Sub-cities (Whole City)</option>
          {subCities.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.nameEn}
            </option>
          ))}
        </select>
      </div>

      {onClose && (
        <div className="pt-4 sm:hidden">
          <Button onClick={onClose} className="w-full h-12 rounded-xl font-bold">
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
}
