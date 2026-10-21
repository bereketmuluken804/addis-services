import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Phone, Star, ShieldCheck, Wrench, Zap, Tv, PaintBucket, Cpu, Shirt, ArrowRight } from 'lucide-react';

export default function App() {
  const categories = [
    { name: 'Plumbing', icon: Wrench, count: 18, color: 'text-emerald-700 bg-emerald-50' },
    { name: 'Electrical', icon: Zap, count: 24, color: 'text-amber-700 bg-amber-50' },
    { name: 'Satellite Dish', icon: Tv, count: 12, color: 'text-blue-700 bg-blue-50' },
    { name: 'Wall Painting', icon: PaintBucket, count: 15, color: 'text-rose-700 bg-rose-50' },
    { name: 'Appliance Repair', icon: Cpu, count: 9, color: 'text-purple-700 bg-purple-50' },
    { name: 'Clothes Washing', icon: Shirt, count: 14, color: 'text-teal-700 bg-teal-50' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur-md">
        <div className="container mx-auto flex h-20 items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="font-heading text-xl font-bold tracking-tight text-foreground">Addis Services</span>
              <span className="hidden text-xs text-muted-foreground sm:block">Verified Domestic Pros</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="font-medium text-foreground">
              Sign In
            </Button>
            <Button variant="default" className="font-semibold">
              Join as a Pro
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Ambient Radial Glow */}
      <section className="relative overflow-hidden bg-ambient-radial py-20 sm:py-28">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-semibold tracking-wide">
            Addis Ababa’s Trusted Local Network
          </Badge>
          <h1 className="mx-auto max-w-3xl font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-[1.15]">
            Hire verified domestic professionals in your neighborhood.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
            Plumbers, electricians, painters, and technicians available right now. Call directly without middleman markups.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="h-14 rounded-2xl px-8 text-base shadow-lg">
              Explore All Services <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="amber" className="h-14 rounded-2xl px-8 text-base">
              Find Available Pros Now
            </Button>
          </div>
        </div>
      </section>

      {/* Services Grid with Generous Whitespace */}
      <section className="container mx-auto py-20">
        <div className="mb-12 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Popular Home Services
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Vetted local experts ready to help in Bole, Yeka, Kirkos, and across Addis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card key={cat.name} className="group cursor-pointer p-8">
                <CardHeader className="p-0">
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${cat.color} transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-md`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-2xl">{cat.name}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground/80">
                    {cat.count} verified pros ready in Addis
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-6 p-0">
                  <span className="flex items-center text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover">
                    View providers <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
