import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, PhoneCall, CheckCircle2, UserCheck, ArrowRight, Zap, Star } from 'lucide-react';
import { HeroSearch } from '@/components/public/HeroSearch';
import { CategoryGrid } from '@/components/public/CategoryGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function HomePage() {
  return (
    <div className="flex flex-col space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-ambient-radial pt-20 pb-28 text-center sm:pt-28 sm:pb-36">
        <div className="container mx-auto px-4">
          

          <h1 className="mx-auto max-w-4xl font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-[1.12]">
            Find verified home technicians in your sub-city.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Connect directly with verified plumbers, electricians, satellite dish installers, and appliance repair pros across Addis Ababa.
          </p>

          <div className="mt-12">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section className="container mx-auto px-4">
        <div className="mb-12 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Domestic Services
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Choose a category to view active and verified professionals near you.
            </p>
          </div>
          <Link to="/services">
            <Button variant="outline" className="rounded-xl font-semibold">
              Browse All Categories <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <CategoryGrid />
      </section>

      {/* Why Choose Addis Services (Anti-Clutter, Airy 3-Column Layout) */}
      <section className="border-y border-border/80 bg-card py-24" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Badge variant="secondary" className="mb-4 font-semibold px-3 py-1">
              Trust & Transparency
            </Badge>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How Addis Services Works
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              We make finding dependable home service providers simple, transparent, and fee-free.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <Card className="p-8 border-border/80 bg-background/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-heading text-xl font-extrabold mb-6 shadow-glow-primary">
                1
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Find Vetted Local Pros
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Filter by service category and your specific sub-city in Addis Ababa (Bole, Yeka, Kirkos, Arada, etc.) to view available specialists.
              </p>
            </Card>

            <Card className="p-8 border-border/80 bg-background/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground font-heading text-xl font-extrabold mb-6 shadow-glow-amber">
                2
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Verified National ID
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Every listed professional must submit a verified government-issued ID card or passport reviewed by our administrative team before going live.
              </p>
            </Card>

            <Card className="p-8 border-border/80 bg-background/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-heading text-xl font-extrabold mb-6 shadow-glow-primary">
                3
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Direct Telephone Calls
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Call providers directly on your mobile device. No middlemen, no commission fees, and no waiting for online chat replies.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pro Recruitment Callout with Forest Green Texture */}
      <section className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-primary-foreground shadow-2xl sm:px-16 sm:py-20">
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-5xl sm:leading-tight text-primary-light">
              Grow your client base across Addis Ababa.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-primary-light/80 leading-relaxed">
              Register as a verified professional today. Get calls directly from local homeowners, businesses, and property managers.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/provider/register">
                <Button size="lg" variant="amber" className="h-14 rounded-2xl px-8 text-base font-bold shadow-lg">
                  Join as a Pro Today
                </Button>
              </Link>
              <Link to="/provider/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-2xl px-8 text-base font-semibold border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  Pro Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
