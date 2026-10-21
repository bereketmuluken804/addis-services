import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Zap, Tv, PaintBucket, Cpu, Shirt, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useCategories } from '@/hooks/useCategories';
import { useSearchStore } from '@/stores/searchStore';

const iconMap = {
  wrench: { icon: Wrench, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  zap: { icon: Zap, color: 'text-amber-700 bg-amber-50 border-amber-100' },
  tv: { icon: Tv, color: 'text-blue-700 bg-blue-50 border-blue-100' },
  'paint-bucket': { icon: PaintBucket, color: 'text-rose-700 bg-rose-50 border-rose-100' },
  cpu: { icon: Cpu, color: 'text-purple-700 bg-purple-50 border-purple-100' },
  shirt: { icon: Shirt, color: 'text-teal-700 bg-teal-50 border-teal-100' },
};

export function CategoryGrid() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useCategories();
  const { setCategory } = useSearchStore();

  const handleCategoryClick = (catId) => {
    setCategory(catId);
    navigate('/providers');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-muted/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const style = iconMap[cat.iconName] || { icon: Wrench, color: 'text-primary bg-primary-light border-primary/20' };
        const Icon = style.icon;

        return (
          <Card
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className="group cursor-pointer p-7 border-border/80 transition-all duration-300 hover:border-primary/40 hover:-translate-y-1.5"
          >
            <CardHeader className="p-0">
              <div
                className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border ${style.color} shadow-xs transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold">{cat.nameEn}</CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground/90 mt-1">
                Verified technicians in Addis Ababa
              </CardDescription>
            </CardHeader>
            <CardFooter className="mt-6 p-0">
              <span className="flex items-center text-sm font-bold text-primary transition-colors group-hover:text-primary-hover">
                Find {cat.nameEn} pros
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1.5" />
              </span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
