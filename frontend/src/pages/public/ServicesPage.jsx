import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Zap, Tv, PaintBucket, Cpu, Shirt, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/useCategories';
import { useSearchStore } from '@/stores/searchStore';

const serviceDetails = {
  plumbing: {
    icon: Wrench,
    scope: 'Residential pipework, water storage tanks, booster pumps, geyser water heater servicing, and drainage repairs.',
    tags: ['Water Pumps', 'Geysers', 'Pipe Leaks', 'Drain Unclogging'],
  },
  electrical: {
    icon: Zap,
    scope: 'Circuit breaker diagnosis, phase imbalance repairs, lighting installation, socket replacements, and safety checks.',
    tags: ['Circuit Breakers', 'Phase Faults', 'Wiring', 'Fixture Mounting'],
  },
  'satellite-dish': {
    icon: Tv,
    scope: 'Multi-satellite dish alignment (NSS 12, Amos, Eutelsat), receiver tuning, signal booster setup, and coaxial cabling.',
    tags: ['Dish Tuning', 'Receiver Setup', 'LNB Replacement', 'Cabling'],
  },
  'wall-painting': {
    icon: PaintBucket,
    scope: 'Interior wall painting, weather-proof exterior coats, gypsum ceiling patches, surface smoothing, and decorative trim.',
    tags: ['Interior Painting', 'Gypsum Repair', 'Exterior Coats', 'Touch-ups'],
  },
  'appliance-repair': {
    icon: Cpu,
    scope: 'Diagnostics and parts replacement for refrigerators, domestic washing machines, stoves, ovens, and water purifiers.',
    tags: ['Refrigerators', 'Washing Machines', 'Ovens & Stoves', 'Motors'],
  },
  'clothes-washing': {
    icon: Shirt,
    scope: 'Experienced home laundry specialists for everyday garments, delicate fabrics, bed linens, curtains, and steam ironing.',
    tags: ['Domestic Laundry', 'Delicate Handwash', 'Ironing & Folding', 'Linens'],
  },
};

export function ServicesPage() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useCategories();
  const { setCategory } = useSearchStore();

  const handleSelectCategory = (id) => {
    setCategory(id);
    navigate('/providers');
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mx-auto max-w-2xl text-center mb-12">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Domestic Trades & Services
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Explore our vetted trade offerings across Addis Ababa. Every listed professional has undergone National ID verification before going live.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="flex flex-col justify-between p-6 border-border bg-card shadow-subtle">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Skeleton className="h-11 w-11 rounded-lg" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
                <div className="flex gap-1.5 mb-6">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-5 w-20 rounded" />
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const detail = serviceDetails[cat.slug] || serviceDetails.plumbing;
            const Icon = detail.icon;

            return (
              <Card key={cat.id} className="flex flex-col justify-between p-6 border-border bg-card shadow-subtle hover:border-primary/50 transition-colors">
                <CardHeader className="p-0">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-light text-primary border border-primary/20 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{cat.nameEn}</CardTitle>
                      <span className="text-[11px] text-muted-foreground">Addis Ababa</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {detail.scope}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-6">
                    {detail.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/75"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardHeader>

                <CardFooter className="p-0 border-t border-border pt-4">
                  <Button
                    onClick={() => handleSelectCategory(cat.id)}
                    size="sm"
                    className="w-full h-9 rounded-lg text-xs font-semibold justify-between"
                  >
                    <span>View {cat.nameEn} Technicians</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
