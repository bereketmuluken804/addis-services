import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12 text-muted-foreground text-xs">
      <div className="container mx-auto grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand Info */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="Addis Services Logo"
              className="h-12 w-12 object-contain rounded-md"
            />
            <span className="font-heading text-base font-bold tracking-tight text-foreground">
              Addis<span className="text-primary font-black">Services</span>
            </span>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            Marketplace connecting Addis Ababa residents with verified domestic service providers. Direct telephone connection with no intermediaries.
          </p>
          <div className="flex items-center space-x-1.5 text-foreground/80 font-medium">
            <MapPin className="h-4 w-4 text-primary" strokeWidth={2.5} />
            <span>Addis Ababa, Ethiopia</span>
          </div>
        </div>

        {/* Domestic Trades */}
        <div className="space-y-2.5">
          <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
            Trades & Services
          </h4>
          <ul className="space-y-1.5">
            <li>
              <Link to="/providers?categoryId=1" className="hover:text-primary transition-colors">
                Plumbing & Water Tanks
              </Link>
            </li>
            <li>
              <Link to="/providers?categoryId=2" className="hover:text-primary transition-colors">
                Electrical & Breakers
              </Link>
            </li>
            <li>
              <Link to="/providers?categoryId=3" className="hover:text-primary transition-colors">
                Satellite Dish Installation
              </Link>
            </li>
            <li>
              <Link to="/providers?categoryId=4" className="hover:text-primary transition-colors">
                Wall Painting & Finishing
              </Link>
            </li>
            <li>
              <Link to="/providers?categoryId=5" className="hover:text-primary transition-colors">
                Home Appliance Repair
              </Link>
            </li>
            <li>
              <Link to="/providers?categoryId=6" className="hover:text-primary transition-colors">
                Clothes Washing & Care
              </Link>
            </li>
          </ul>
        </div>

        {/* Service Sub-cities */}
        <div className="space-y-2.5">
          <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
            Addis Sub-Cities
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {['Bole', 'Yeka', 'Kirkos', 'Arada', 'Lideta', 'Nifas Silk', 'Gullele', 'Lemi Kura', 'Kolfe Keranio', 'Akaky Kaliti'].map((sub) => (
              <span
                key={sub}
                className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/75"
              >
                {sub}
              </span>
            ))}
          </div>
        </div>

        {/* Provider Onboarding */}
        <div className="space-y-2.5">
          <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
            For Technicians
          </h4>
          <p className="leading-relaxed text-muted-foreground">
            Are you a certified technician in Addis Ababa? Register your trade credentials to get listed in your sub-city.
          </p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Link to="/provider/register">
              <button className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-subtle hover:bg-primary-hover transition-colors">
                Apply as a Provider
              </button>
            </Link>
            <Link to="/provider/login">
              <button className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                Provider Login
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-8 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <p>© {new Date().getFullYear()} Addis Services. Addis Ababa, Ethiopia.</p>
       
      </div>
    </footer>
  );
}
