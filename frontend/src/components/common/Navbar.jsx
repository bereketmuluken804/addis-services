import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3.5 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow-primary transition-transform duration-300 group-hover:scale-105">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="font-heading text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Addis<span className="text-primary">Services</span>
            </span>
            <span className="block text-[11px] font-medium tracking-wide text-muted-foreground">
              Verified Domestic Pros
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center space-x-8 md:flex">
          <Link
            to="/providers"
            className="text-sm font-semibold text-foreground/80 transition-colors hover:text-primary"
          >
            Find Pros
          </Link>
          <Link
            to="/services"
            className="text-sm font-semibold text-foreground/80 transition-colors hover:text-primary"
          >
            All Services
          </Link>
          <a
            href="#how-it-works"
            className="text-sm font-semibold text-foreground/80 transition-colors hover:text-primary"
          >
            How It Works
          </a>
        </nav>

        {/* Action Buttons & Auth */}
        <div className="hidden items-center space-x-3.5 md:flex">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              {user?.role === 'PROVIDER' && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/provider/dashboard')}
                  className="rounded-xl font-semibold"
                >
                  Pro Dashboard
                </Button>
              )}
              {user?.role === 'ADMIN' && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/dashboard')}
                  className="rounded-xl font-semibold"
                >
                  Admin Portal
                </Button>
              )}
              <div className="flex items-center space-x-2 pl-2">
                <Badge variant="secondary" className="px-3 py-1 font-medium">
                  <User className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  {user?.fullName || user?.role}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Log out"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/provider/login')}
                className="rounded-xl font-semibold text-foreground"
              >
                Pro Login
              </Button>
              <Button
                variant="default"
                onClick={() => navigate('/provider/register')}
                className="rounded-xl font-semibold shadow-sm"
              >
                Join as a Pro
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-11 w-11 rounded-xl"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-card px-6 py-6 shadow-xl md:hidden">
          <nav className="flex flex-col space-y-4">
            <Link
              to="/providers"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-foreground hover:text-primary"
            >
              Find Pros
            </Link>
            <Link
              to="/services"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-foreground hover:text-primary"
            >
              All Services
            </Link>
            <div className="border-t border-border/80 pt-4">
              {isAuthenticated ? (
                <div className="flex flex-col space-y-3">
                  {user?.role === 'PROVIDER' && (
                    <Button
                      variant="default"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/provider/dashboard');
                      }}
                      className="w-full justify-center rounded-xl"
                    >
                      Pro Dashboard
                    </Button>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Button
                      variant="default"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/admin/dashboard');
                      }}
                      className="w-full justify-center rounded-xl"
                    >
                      Admin Portal
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full justify-center rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    Log Out
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/provider/login');
                    }}
                    className="w-full justify-center rounded-xl font-semibold"
                  >
                    Pro Sign In
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/provider/register');
                    }}
                    className="w-full justify-center rounded-xl font-semibold"
                  >
                    Join as a Pro
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
