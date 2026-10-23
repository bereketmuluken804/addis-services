import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useProviders } from '@/hooks/useProviders';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { useSearchParams } from 'react-router-dom';
import { useSearchStore } from '@/stores/searchStore';
import { ProviderCard } from '@/components/public/ProviderCard';
import { FilterContent, FilterDrawer } from '@/components/public/FilterDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function DirectoryPage() {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();

  const {
    categoryId,
    subCityId,
    availableOnly,
    searchTerm,
    sortBy,
    page,
    limit,
    setPage,
    setCategory,
    setSubCity,
    setAvailableOnly,
    setSortBy,
    resetFilters,
  } = useSearchStore();

  useEffect(() => {
    const catParam = searchParams.get('categoryId');
    const subParam = searchParams.get('subCityId');
    const sortParam = searchParams.get('sortBy');
    if (catParam) setCategory(Number(catParam));
    if (subParam) setSubCity(Number(subParam));
    if (sortParam) setSortBy(sortParam);
  }, [searchParams]);

  const { data: response, isLoading } = useProviders({
    categoryId,
    subCityId,
    availableOnly,
    searchTerm,
    sortBy,
    page,
    limit,
  });

  const providers = response?.data || [];
  const pagination = response?.pagination || { total: providers.length, page: 1, limit: 12, totalPages: 1 };

  const currentCategory = categories.find((c) => c.id === categoryId);
  const currentSubCity = locations[0]?.subCities?.find((s) => s.id === subCityId);

  const activeFiltersCount = (categoryId ? 1 : 0) + (subCityId ? 1 : 0) + (availableOnly ? 1 : 0) + (searchTerm ? 1 : 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Top Banner / Heading */}
      <div className="mb-6 flex flex-col justify-between gap-3 border-b border-border pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {currentCategory ? `${currentCategory.nameEn} Technicians` : 'Verified Technicians'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {currentSubCity
              ? `Available service specialists in ${currentSubCity.nameEn}, Addis Ababa`
              : 'Direct connection with vetted domestic professionals across Addis Ababa'}
          </p>
        </div>

        {/* Mobile Filter Trigger */}
        <div className="sm:hidden">
          <Button
            onClick={() => setMobileFilterOpen(true)}
            variant="outline"
            className="w-full h-9 text-xs font-semibold justify-between"
          >
            <span className="flex items-center">
              <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
              Filter Technicians
            </span>
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Main Layout: Desktop Sidebar (Left) + Content (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Desktop Sticky Filters Sidebar */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20 border border-border bg-card p-4 shadow-subtle">
            <FilterContent />
          </div>
        </aside>

        {/* Providers Listing Column */}
        <main className="lg:col-span-3">
          {/* Active Filter Badges Bar */}
          {activeFiltersCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Active:</span>
              {currentCategory && (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs gap-1 cursor-pointer font-medium" onClick={() => setCategory(null)}>
                  {currentCategory.nameEn} ✕
                </Badge>
              )}
              {currentSubCity && (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs gap-1 cursor-pointer font-medium" onClick={() => setSubCity(null)}>
                  {currentSubCity.nameEn} ✕
                </Badge>
              )}
              {availableOnly && (
                <Badge variant="success" className="px-2 py-0.5 text-xs gap-1 cursor-pointer font-medium" onClick={() => setAvailableOnly(false)}>
                  Available Now ✕
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="outline" className="px-2 py-0.5 text-xs gap-1 cursor-pointer font-medium" onClick={() => resetFilters()}>
                  "{searchTerm}" ✕
                </Badge>
              )}
              <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-2">
                Clear all
              </button>
            </div>
          )}

          {/* Results Count & Sorting Bar */}
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{providers.length}</strong> {providers.length === 1 ? 'technician' : 'technicians'}
              {pagination.total > 0 ? ` of ${pagination.total}` : ''}
            </span>

            <div className="flex items-center space-x-1.5">
              <span>Sort:</span>
              <select
                value={sortBy || 'rating'}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 border border-input bg-card px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="rating">Highest Rating</option>
                <option value="reviews">Most Reviews</option>
                <option value="calls">Most Contacted</option>
              </select>
            </div>
          </div>

          {/* Provider Grid or Skeletons or Empty State */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-border bg-card flex flex-col shadow-subtle">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <div className="p-2.5 flex gap-2 border-t border-border">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="border border-dashed border-border bg-card p-12 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center bg-muted text-muted-foreground mb-3">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-base font-bold text-foreground">
                No matching technicians found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                No verified providers currently match your active filters in this sub-city.
              </p>
              <Button onClick={resetFilters} size="sm" variant="default" className="mt-4 text-xs font-semibold">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-8 px-3 text-xs font-medium"
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="h-8 px-3 text-xs font-medium"
              >
                Next
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
      />
    </div>
  );
}
