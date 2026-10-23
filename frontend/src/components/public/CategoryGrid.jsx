import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Zap, Tv, PaintBucket, Cpu, Shirt, ArrowRight } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useSearchStore } from '@/stores/searchStore';

const categoryMeta = {
  plumbing: {
    icon: Wrench,
    summary: 'Water pumps, geysers, pipe leaks & drainage',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80',
  },
  electrical: {
    icon: Zap,
    summary: 'Circuit breakers, short circuits & rewiring',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
  },
  'satellite-dish': {
    icon: Tv,
    summary: 'NSS, Amos, Eutelsat dish tuning & cabling',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
  },
  'wall-painting': {
    icon: PaintBucket,
    summary: 'Interior, exterior, gypsum & plaster finishing',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
  },
  'appliance-repair': {
    icon: Cpu,
    summary: 'Refrigerators, washing machines & stove repairs',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  },
  'clothes-washing': {
    icon: Shirt,
    summary: 'Residential laundry, delicate fabrics & ironing',
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
  },
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-52 bg-muted/60 animate-pulse border border-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const meta = categoryMeta[cat.slug] || {
          icon: Wrench,
          summary: 'Verified domestic technicians in Addis Ababa',
          image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        };
        const Icon = meta.icon;

        return (
          <div
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className="group relative cursor-pointer overflow-hidden border border-border h-56 transition-all duration-200 hover:border-primary/80 shadow-subtle flex flex-col justify-end p-5 bg-slate-900"
          >
            {/* Background Image with Dark Contrast Gradient Overlay */}
            <img
              src={meta.image}
              alt={cat.nameEn}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-65"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/20" />

            {/* Content */}
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 backdrop-blur-xs text-white border border-white/20">
                  <Icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-semibold text-white/75 group-hover:text-white transition-colors flex items-center">
                  Browse <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                </span>
              </div>

              <div>
                <h3 className="font-heading text-lg font-bold text-white group-hover:text-secondary transition-colors">
                  {cat.nameEn}
                </h3>
                <p className="mt-0.5 text-xs text-white/75 leading-relaxed line-clamp-2">
                  {meta.summary}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
