import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallModalStore } from '@/stores/callModalStore';

export function ProviderCard({ provider }) {
  const { openCallModal } = useCallModalStore();

  const rating = Number(provider.averageRating || 0).toFixed(1);
  const reviewsCount = provider.reviewCount || 0;
  const initials = provider.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SP';

  const categoryName = provider.categoryName || provider.category?.nameEn || 'Technician';
  const locationName = provider.subCityName || provider.subCity?.nameEn || 'Addis Ababa';

  return (
    <div className="group flex flex-col border border-border bg-card shadow-subtle hover:border-primary/80 transition-all duration-200">
      {/* 80% Avatar Image Area (Sharp Rectangle) */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
        {provider.avatarUrl ? (
          <img
            src={provider.avatarUrl}
            alt={provider.fullName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-white/20 bg-white/10 font-heading text-xl font-bold text-white mb-2">
              {initials}
            </div>
            <span className="text-xs text-white/60 font-medium">{categoryName}</span>
          </div>
        )}

        {/* Gradient overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/40 pointer-events-none" />

        {/* Top Floating Badges (Harmonious Rounded Pills over Sharp Frame) */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
          <span className="rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 border border-white/20 shadow-xs">
            {categoryName}
          </span>
          <div className="flex items-center gap-1.5">
            {provider.isAvailable ? (
              <span className="rounded-full bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 shadow-xs">
                Available
              </span>
            ) : (
              <span className="rounded-full bg-black/75 text-white/80 text-[10px] font-medium px-2 py-0.5 border border-white/20">
                Busy
              </span>
            )}
            
          </div>
        </div>

        {/* Bottom Image Info: Name, Location, Rating */}
        <div className="absolute bottom-2.5 inset-x-2.5 z-10 text-white space-y-0.5">
          <Link
            to={`/providers/${provider.id}`}
            className="font-heading text-base font-bold text-white hover:text-secondary transition-colors truncate block"
          >
            {provider.fullName}
          </Link>
          <div className="flex items-center justify-between text-xs text-white/85 pt-0.5">
            <span className="flex items-center text-[11px] truncate max-w-[130px]">
              <MapPin className="mr-1 h-4 w-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
              {locationName}
            </span>
            <span className="flex items-center font-bold text-xs text-white shrink-0">
              <Star className="mr-1 h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={2.5} />
              {rating > 0 ? rating : 'New'}
              {reviewsCount > 0 && <span className="text-white/60 ml-0.5 font-normal text-[10px]">({reviewsCount})</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Remaining ~20% of Card: Details & Call Action Buttons */}
      <div className="p-2.5 bg-card border-t border-border flex items-center gap-2">
        <Link to={`/providers/${provider.id}`} className="flex-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs font-semibold rounded-md border-border hover:bg-muted"
          >
            Details
          </Button>
        </Link>
        <Button
          size="sm"
          onClick={() => openCallModal(provider)}
          className="flex-1 h-8 text-xs font-semibold rounded-md shadow-subtle"
        >
          <Phone className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
          Call
        </Button>
      </div>
    </div>
  );
}
