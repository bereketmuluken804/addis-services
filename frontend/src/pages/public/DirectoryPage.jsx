import React, { useState } from 'react';
import { Filter, Search, RotateCcw, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useProviders } from '@/hooks/useProviders';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { useSearchStore } from '@/stores/searchStore';
import { ProviderCard } from '@/components/public/ProviderCard';
import { FilterContent } from '@/components/public/FilterDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';

export function DirectoryPage() {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();

  const {
    categoryId,
    subCityId,
    availableOnly,
    searchTerm,
    page,
    limit,
    setPage,
    setCategory,
    setSubCity,
    setAvailableOnly,
    resetFilters,
  } = useSearchStore();

  const { data: response, isLoading } = useProviders({
    categoryId,
    subCityId,
    availableOnly,
    searchTerm,
    page,
    limit,
  });

  const providers = response?.data || [];
  const pagination = response?.pagination || { total: providers.length, page: 1, limit: 12, totalPages: 1 };

  const currentCategory = categories.find((c) => c.id === categoryId);
  const currentSubCity = locations[0]?.subCities?.find((s) => s.id === subCityId);

  const activeFiltersCount = (categoryId ? 1 : 0) + (subCityId ? 1 : 0) + (availableOnly ? 1 : 0) + (searchTerm ? 1 : 0);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Top Banner / Heading */}
      <div className="mb-10 flex flex-col justify-between gap-4 border-b border-border/80 pb-8 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {currentCategory ? `${currentCategory.nameEn} Providers` : 'All Domestic Service Providers'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {currentSubCity ? `Verified professionals serving ${currentSubCity.nameEn}, Addis Ababa` : 'Showing verified domestic specialists across all sub-cities of Addis Ababa'}
          </p>
        </div>

        {/* Mobile Filter Trigger */}
        <div className="sm:hidden">
          <Button
            onClick={() => setMobileFilterOpen(true)}
            variant="outline"
            className="w-full h-12 rounded-xl font-bold justify-between shadow-xs"
          >
            <span className="flex items-center">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filter Results
            </span>
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Main Layout: Desktop Sidebar (Left) + Content (Right) */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
        {/* Desktop Sticky Filters Sidebar */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-28 rounded-2xl border border-border/80 bg-card p-6 shadow-subtle">
            <FilterContent />
          </div>
        </aside>

        {/* Providers Listing Column */}
        <main className="lg:col-span-3">
          {/* Active Filter Badges Bar */}
          {activeFiltersCount > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Active Filters:</span>
              {currentCategory && (
                <Badge variant="secondary" className="px-3 py-1 gap-1.5 cursor-pointer" onClick={() => setCategory(null)}>
                  {currentCategory.nameEn} ✕
                </Badge>
              )}
              {currentSubCity && (
                <Badge variant="secondary" className="px-3 py-1 gap-1.5 cursor-pointer" onClick={() => setSubCity(null)}>
                  {currentSubCity.nameEn} ✕
                </Badge>
              )}
              {availableOnly && (
                <Badge variant="success" className="px-3 py-1 gap-1.5 cursor-pointer" onClick={() => setAvailableOnly(false)}>
                  Available Now ✕
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="outline" className="px-3 py-1 gap-1.5 cursor-pointer" onClick={() => resetFilters()}>
                  "{searchTerm}" ✕
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs text-muted-foreground">
                Clear all
              </Button>
            </div>
          )}

          {/* Results Count Header */}
          <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{providers.length}</strong> {providers.length === 1 ? 'provider' : 'providers'}
              {pagination.total > 0 ? ` (of ${pagination.total} total)` : ''}
            </span>
          </div>

          {/* Provider Grid or Skeletons or Empty State */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border border-border/80 bg-card p-7 space-y-4 shadow-subtle">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-16 w-16 rounded-2xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 bg-card/60 p-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                No verified providers found
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                We couldn’t find any verified providers matching your exact search filters. Try adjusting the sub-city or clearing availability.
              </p>
              <Button onClick={resetFilters} variant="default" className="mt-6 rounded-xl font-semibold">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-11 rounded-xl px-4 font-semibold"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm font-semibold text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="h-11 rounded-xl px-4 font-semibold"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <DrawerContent className="p-6">
          <FilterContent onClose={() => setMobileFilterOpen(false)} />
        </DrawerContent>
      </Drawer>
    </div>
  );
}
