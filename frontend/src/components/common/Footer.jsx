import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Phone, MapPin, Heart, Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card py-16 text-muted-foreground">
      <div className="container mx-auto grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand Info */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-foreground">
              Addis<span className="text-primary">Services</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The premier marketplace connecting households and businesses in Addis Ababa with verified, skilled domestic technicians.
          </p>
          <div className="flex items-center space-x-2 text-xs font-medium text-foreground/80">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Addis Ababa, Ethiopia</span>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-4">
          <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
            Domestic Services
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/providers?categoryId=1" className="hover:text-primary transition-colors">
                Plumbing & Pipe Repair
              </Link>
            </li>
            <li>
              <Link to="/providers?categoryId=2" className="hover:text-primary transition-colors">
                Electrical & Wiring
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

        {/* Popular Sub-cities */}
        <div className="space-y-4">
          <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
            Service Areas
          </h4>
          <div className="flex flex-wrap gap-2">
            {['Bole', 'Yeka', 'Kirkos', 'Arada', 'Lideta', 'Nifas Silk', 'Gullele', 'Lemi Kura'].map((sub) => (
              <span
                key={sub}
                className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground/75"
              >
                {sub}
              </span>
            ))}
          </div>
        </div>

        {/* For Professionals */}
        <div className="space-y-4">
          <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
            For Service Providers
          </h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Are you a skilled technician in Addis Ababa? Join our verified network and get called directly by customers every day.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/provider/register">
              <button className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors">
                Apply as a Provider
              </button>
            </Link>
            <Link to="/provider/login">
              <button className="inline-flex h-10 items-center justify-center rounded-xl border border-border/80 px-4 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Pro Portal
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-12 border-t border-border/70 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
        <p>© {new Date().getFullYear()} Addis Services. Built with care for domestic technicians & households in Addis Ababa.</p>
        <div className="flex items-center gap-4">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-muted-foreground/80 hover:text-primary transition-colors font-medium"
          >
            <Shield className="h-3.5 w-3.5" />
            Admin Console
          </Link>
        </div>
      </div>
    </footer>
  );
}
