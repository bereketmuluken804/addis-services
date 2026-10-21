import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Zap, Tv, PaintBucket, Cpu, Shirt, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useCategories } from '@/hooks/useCategories';
import { useSearchStore } from '@/stores/searchStore';

const serviceDetails = {
  plumbing: {
    icon: Wrench,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    tasks: ['Pipe leak repairs & replacements', 'Toilet & sink unclogging', 'Water pump & tank installations', 'Water heater (geyser) servicing'],
  },
  electrical: {
    icon: Zap,
    color: 'text-amber-700 bg-amber-50 border-amber-100',
    tasks: ['Short circuit diagnosis & repair', 'Circuit breaker & fuse box upgrades', 'Socket & switch replacements', 'Interior & exterior lighting setups'],
  },
  'satellite-dish': {
    icon: Tv,
    color: 'text-blue-700 bg-blue-50 border-blue-100',
    tasks: ['NSS / Amos / Eutelsat dish alignments', 'Receiver decoding & channel tuning', 'LNB replacement & signal boost', 'Multi-room TV cabling'],
  },
  'wall-painting': {
    icon: PaintBucket,
    color: 'text-rose-700 bg-rose-50 border-rose-100',
    tasks: ['Interior wall & ceiling painting', 'Exterior weather-proof coating', 'Plaster & gypsum patch repairs', 'Decorative finishes & accents'],
  },
  'appliance-repair': {
    icon: Cpu,
    color: 'text-purple-700 bg-purple-50 border-purple-100',
    tasks: ['Washing machine & dryer diagnostics', 'Refrigerator & freezer cooling fixes', 'Oven, microwave & stove repairs', 'Water purifier maintenance'],
  },
  'clothes-washing': {
    icon: Shirt,
    color: 'text-teal-700 bg-teal-50 border-teal-100',
    tasks: ['Residential domestic laundry care', 'Delicate fabric hand washing', 'Ironing, folding & garment steaming', 'Blanket, curtain & linen washing'],
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
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl text-center mb-16">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Domestic Service Categories
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Explore our vetted home service offerings in Addis Ababa. Every provider has verified identity credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const detail = serviceDetails[cat.slug] || serviceDetails.plumbing;
          const Icon = detail.icon;

          return (
            <Card key={cat.id} className="flex flex-col justify-between p-8 border-border/80">
              <CardHeader className="p-0">
                <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border ${detail.color} shadow-xs`}>
                  <Icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-bold">{cat.nameEn}</CardTitle>
                <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
                  Trusted local specialists in Addis Ababa
                </CardDescription>

                <ul className="mt-6 space-y-2.5">
                  {detail.tasks.map((task, idx) => (
                    <li key={idx} className="flex items-start text-xs font-medium text-foreground/80">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </CardHeader>

              <CardFooter className="mt-8 p-0">
                <Button
                  onClick={() => handleSelectCategory(cat.id)}
                  className="w-full h-12 rounded-xl font-bold justify-between"
                >
                  <span>Find {cat.nameEn} Pros</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
