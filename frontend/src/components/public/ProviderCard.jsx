import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Star, MapPin, Briefcase, Phone } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  return (
    <Card className="flex flex-col justify-between p-7 transition-all duration-300 hover:border-primary/40 hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="flex items-start justify-between gap-4">
          {/* Avatar and Provider Details */}
          <div className="flex items-center space-x-4">
            {provider.avatarUrl ? (
              <img
                src={provider.avatarUrl}
                alt={provider.fullName}
                className="h-16 w-16 rounded-2xl object-cover shadow-sm border border-border"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light font-heading text-lg font-bold text-primary shadow-xs">
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <Link
                  to={`/providers/${provider.id}`}
                  className="font-heading text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
                >
                  {provider.fullName}
                </Link>
                <span title="Verified by National ID & Admin Review">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                </span>
              </div>
              <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="px-2.5 py-0.5 font-semibold text-primary">
                  {provider.categoryName || provider.category?.nameEn}
                </Badge>
                {provider.experienceYears ? (
                  <span className="flex items-center">
                    <Briefcase className="mr-1 h-3 w-3" />
                    {provider.experienceYears}y exp
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Availability Status Badge */}
          <div>
            {provider.isAvailable ? (
              <Badge variant="success" className="px-2.5 py-1 text-[11px] font-semibold gap-1.5 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Available
              </Badge>
            ) : (
              <Badge variant="outline" className="px-2.5 py-1 text-[11px] text-muted-foreground font-medium">
                Busy / Offline
              </Badge>
            )}
          </div>
        </div>

        {/* Rating and Location */}
        <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-sm">
          <div className="flex items-center space-x-1.5">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-bold text-foreground">{rating > 0 ? rating : 'New'}</span>
            <span className="text-xs text-muted-foreground">
              ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
          <div className="flex items-center text-xs font-medium text-muted-foreground">
            <MapPin className="mr-1 h-3.5 w-3.5 text-primary" />
            <span>
              {provider.subCityName || provider.subCity?.nameEn || 'Addis Ababa'}
              {provider.woreda ? `, W. ${provider.woreda}` : ''}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-4 p-0">
        <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
          {provider.bio || 'Skilled local service provider offering trusted repairs and maintenance across Addis Ababa.'}
        </p>
      </CardContent>

      <CardFooter className="mt-6 p-0 flex items-center gap-3">
        <Link to={`/providers/${provider.id}`} className="flex-1">
          <Button variant="outline" className="w-full h-11 rounded-xl font-semibold">
            View Profile
          </Button>
        </Link>
        <Button
          variant="default"
          onClick={() => openCallModal(provider)}
          className="flex-1 h-11 rounded-xl font-bold shadow-sm hover:shadow-md"
        >
          <Phone className="mr-2 h-4 w-4" />
          Call Now
        </Button>
      </CardFooter>
    </Card>
  );
}
