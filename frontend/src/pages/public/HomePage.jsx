import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, PhoneCall, CheckCircle2, UserCheck, ArrowRight, Star, MapPin, Briefcase } from 'lucide-react';
import { HeroSearch } from '@/components/public/HeroSearch';
import { CategoryGrid } from '@/components/public/CategoryGrid';
import { ProviderCard } from '@/components/public/ProviderCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviders } from '@/hooks/useProviders';

export function HomePage() {
  const location = useLocation();
  const { data: popularResponse, isLoading: isPopularLoading } = useProviders({
    sortBy: 'rating',
    limit: 4,
  });

  const popularProviders = popularResponse?.data || [];

  useEffect(() => {
    if (location.hash === '#how-it-works' || window.location.hash === '#how-it-works') {
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById('how-it-works');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(scrollTimer);
    }
  }, [location.hash]);

  return (
    <div className="flex flex-col space-y-16 pb-16">
      {/* Hero Section with House Representation Background */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-20 pb-24 text-center sm:pt-28 sm:pb-32 border-b border-border">
        {/* Background Image: House Maintenance featuring exterior house and service technician */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity"
          style={{
            backgroundImage: "url('https://www.iko.com/na/wp-content/uploads/2026/02/summer-home-maintenance.jpg')",
          }}
        />
        {/* Balanced Overlay for clarity & text legibility without blacking out the technician or home */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/35 to-slate-950/75" />

        <div className="relative z-10 container mx-auto px-4 max-w-4xl flex flex-col items-center">
          {/* Brand Monogram Logo */}
          <div className="mb-6 inline-flex items-center justify-center p-2.5 rounded-2xl bg-white/95 shadow-2xl backdrop-blur-sm border border-white/30 transition-transform duration-300 hover:scale-105">
            <img
              src="/logo.png"
              alt="Addis Home Services"
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain"
            />
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.15] drop-shadow-md">
            Direct connection with verified local service professionals.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-white sm:text-base leading-relaxed drop-shadow-md font-medium">
            Plumbing, electrical repairs, satellite TV alignment, wall finishing, appliance diagnostics, and laundry. Verified National IDs, direct telephone calls, no middleman fees.
          </p>

          <div className="mt-8">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Services Grid Section with Photo Cards */}
      <section className="container mx-auto px-4">
        <div className="mb-8 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left border-b border-border pb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Domestic Services
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select a trade to view active and verified technicians in your sub-city.
            </p>
          </div>
          <Link to="/services">
            <Button variant="outline" size="sm" className="font-semibold text-xs h-9">
              View All Trades <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={2.5} />
            </Button>
          </Link>
        </div>

        <CategoryGrid />
      </section>

      {/* Featured & Popular Providers (Dynamically Loaded) */}
      <section className="container mx-auto px-4">
        <div className="mb-8 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left border-b border-border pb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Highly Rated Technicians
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Top-reviewed professionals verified with government ID ready for direct contact.
            </p>
          </div>
          <Link to="/providers?sortBy=rating">
            <Button variant="outline" size="sm" className="font-semibold text-xs h-9">
              Explore All Providers <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={2.5} />
            </Button>
          </Link>
        </div>

        {isPopularLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 border border-border bg-card space-y-3">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : popularProviders.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-border bg-card">
            <h3 className="font-heading text-base font-bold text-foreground">
              Verified Providers Directory
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
              No approved technicians are currently featured. Register your trade credentials to be listed in your sub-city.
            </p>
            <Link to="/provider/register" className="mt-4 inline-block">
              <Button size="sm" className="text-xs font-semibold">
                Apply for Verification
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popularProviders.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </section>

      {/* How It Operates */}
      <section className="border-y border-border bg-card py-14 scroll-mt-16" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-10">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              How Addis Services Works
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A transparent, direct marketplace built specifically for Addis Ababa households and tradespeople.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            <div className="flex flex-col items-start p-5 border border-border bg-background">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-light text-primary font-bold text-xs mb-3">
                01
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">
                Find Nearby Specialists
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Filter by trade and your sub-city (Bole, Yeka, Kirkos, Arada, etc.) to identify technicians ready to respond in your neighborhood.
              </p>
            </div>

            <div className="flex flex-col items-start p-5 border border-border bg-background">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary-light text-secondary-hover font-bold text-xs mb-3">
                02
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">
                National ID Verification
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Every listed professional must submit a verified government-issued ID card or passport before their public profile is reviewed and approved.
              </p>
            </div>

            <div className="flex flex-col items-start p-5 border border-border bg-background">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-light text-primary font-bold text-xs mb-3">
                03
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">
                Direct Mobile Contact
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Call the technician directly on their mobile phone. Agree on project scope and pricing directly—no middleman taking a cut of their earnings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Recruitment Callout with Sharp Edges */}
      <section className="container mx-auto px-4 max-w-4xl">
        <div className="bg-primary px-8 py-10 text-primary-foreground shadow-card sm:px-10 sm:py-12 selection:bg-white selection:text-primary border border-primary/40">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="max-w-xl">
              <h2 className="font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
                Are you a skilled technician in Addis Ababa?
              </h2>
              <p className="mt-1.5 text-xs text-primary-light/90 leading-relaxed">
                Register your credentials, get verified with your National ID, and receive direct phone inquiries from nearby clients with zero commission fees.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <Link to="/provider/register">
                <Button variant="amber" className="font-semibold text-xs h-9 px-4 shadow-subtle">
                  Apply for Verification
                </Button>
              </Link>
              <Link to="/provider/login">
                <Button
                  variant="outline"
                  className="font-semibold text-xs h-9 px-4 border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  Provider Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Admin Console Link */}
      <div className="container mx-auto px-4 flex justify-center -mt-6">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/75 hover:text-foreground transition-all duration-200 px-3.5 py-1.5 rounded-md border border-border/80 bg-card hover:bg-muted shadow-subtle group"
        >
          <Lock className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={2.5} />
          <span>Admin Console</span>
        </Link>
      </div>
    </div>
  );
}
