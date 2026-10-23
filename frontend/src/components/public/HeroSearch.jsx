import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { useSearchStore } from '@/stores/searchStore';

export function HeroSearch() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading: isCatLoading } = useCategories();
  const { data: locations = [], isLoading: isLocLoading } = useLocations();
  const {
    categoryId,
    subCityId,
    setCategory,
    setSubCity,
  } = useSearchStore();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate('/providers');
  };

  const handleQuickCategory = (catId) => {
    setCategory(catId);
    navigate('/providers');
  };

  // Addis Ababa sub-cities
  const subCities = locations[0]?.subCities || [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 border border-white/20 bg-card p-2 shadow-card sm:flex-row sm:items-center text-left"
      >
        {/* Service Category Selector */}
        <div className="flex flex-1 items-center space-x-3 px-3 py-2 sm:py-1">
          <Wrench className="h-5 w-5 text-primary shrink-0" strokeWidth={2.5} />
          <div className="w-full text-left">
            <label htmlFor="category-select" className="block text-xs font-semibold text-foreground/70">
              Service
            </label>
            <select
              id="category-select"
              value={categoryId || ''}
              onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-transparent font-medium text-foreground outline-none text-sm cursor-pointer"
            >
              <option value="">{isCatLoading ? "Loading Services..." : "All Services & Trades"}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="hidden h-8 w-[1px] bg-border sm:block" />

        {/* Sub-city Location Selector */}
        <div className="flex flex-1 items-center space-x-3 px-3 py-2 sm:py-1">
          <MapPin className="h-5 w-5 text-primary shrink-0" strokeWidth={2.5} />
          <div className="w-full text-left">
            <label htmlFor="subcity-select" className="block text-xs font-semibold text-foreground/70">
              Location
            </label>
            <select
              id="subcity-select"
              value={subCityId || ''}
              onChange={(e) => setSubCity(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-transparent font-medium text-foreground outline-none text-sm cursor-pointer"
            >
              <option value="">{isLocLoading ? "Loading Sub-Cities..." : "All Addis Sub-Cities"}</option>
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
          size="default"
          className="h-11 rounded-md px-6 font-semibold shadow-subtle sm:w-auto"
        >
          <Search className="mr-2 h-5 w-5" strokeWidth={2.5} />
          Find Technicians
        </Button>
      </form>

      {/* Quick Filter Links (Harmonious Rounded Pills against Sharp Card) */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-white/90">
        <span className="font-medium text-white/70">Popular trades:</span>
        {categories.slice(0, 5).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleQuickCategory(cat.id)}
            className="rounded-full border border-white/20 bg-black/40 backdrop-blur-xs px-3 py-1 text-xs font-medium text-white hover:border-primary/80 hover:bg-black/60 transition-colors shadow-xs"
          >
            {cat.nameEn}
          </button>
        ))}
      </div>
    </div>
  );
}
