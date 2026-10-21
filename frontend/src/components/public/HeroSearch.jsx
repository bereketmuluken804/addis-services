import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Wrench, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { useSearchStore } from '@/stores/searchStore';

export function HeroSearch() {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const {
    searchTerm,
    categoryId,
    subCityId,
    setSearchTerm,
    setCategory,
    setSubCity,
  } = useSearchStore();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate('/providers');
  };

  // Addis Ababa sub-cities
  const subCities = locations[0]?.subCities || [];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-3 rounded-3xl border border-border/90 bg-card p-3.5 shadow-2xl transition-all sm:flex-row sm:items-center sm:gap-2 sm:p-2.5"
      >
        {/* Service Category Selector */}
        <div className="flex flex-1 items-center space-x-3 px-4 py-2 sm:py-0">
          <Wrench className="h-5 w-5 text-primary shrink-0" />
          <div className="w-full text-left">
            <label htmlFor="category-select" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              What do you need?
            </label>
            <select
              id="category-select"
              value={categoryId || ''}
              onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-transparent font-medium text-foreground outline-none text-sm cursor-pointer"
            >
              <option value="">All Services & Repairs</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="hidden h-9 w-[1px] bg-border sm:block" />

        {/* Sub-city Location Selector */}
        <div className="flex flex-1 items-center space-x-3 px-4 py-2 sm:py-0">
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          <div className="w-full text-left">
            <label htmlFor="subcity-select" className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Location in Addis
            </label>
            <select
              id="subcity-select"
              value={subCityId || ''}
              onChange={(e) => setSubCity(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-transparent font-medium text-foreground outline-none text-sm cursor-pointer"
            >
              <option value="">All Sub-cities (Whole City)</option>
              {subCities.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="h-14 rounded-2xl px-8 text-base font-bold shadow-md hover:shadow-lg sm:w-auto"
        >
          <Search className="mr-2 h-5 w-5" />
          Search Pros
        </Button>
      </form>

      {/* Popular Quick Filter Pills with Generous Spacing */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-xs text-muted-foreground">
        <span className="font-medium">Popular:</span>
        {categories.slice(0, 4).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setCategory(cat.id);
              navigate('/providers');
            }}
            className="rounded-full border border-border/80 bg-card/80 px-3.5 py-1.5 font-medium text-foreground/80 transition-all hover:border-primary/40 hover:bg-primary-light hover:text-primary shadow-2xs"
          >
            {cat.nameEn}
          </button>
        ))}
      </div>
    </div>
  );
}
