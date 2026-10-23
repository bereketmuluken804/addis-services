import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Menu, X, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { CustomerAuthModal } from '@/components/auth/CustomerAuthModal';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img
              src="/logo.png"
              alt="Addis Services Logo"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-md"
            />
            <div className="leading-tight">
              <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                Addis<span className="text-primary font-black">Services</span>
              </span>
              <span className="block text-[11px] font-medium text-muted-foreground">
                Addis Ababa Verified Trades
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center space-x-7 md:flex">
            <Link
              to="/providers"
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              Find Service Providers
            </Link>
            <Link
              to="/services"
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              Services
            </Link>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              How It Works
            </a>
          </nav>

          {/* Action Buttons & Auth */}
          <div className="hidden items-center space-x-3 md:flex">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {user?.role === 'PROVIDER' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/provider/dashboard')}
                    className="font-medium rounded-lg text-xs h-9"
                  >
                    Provider Dashboard
                  </Button>
                )}
                {user?.role === 'ADMIN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin/dashboard')}
                    className="font-medium rounded-lg text-xs h-9"
                  >
                    Admin Portal
                  </Button>
                )}
                <div className="flex items-center space-x-2 pl-1">
                  <Badge variant="secondary" className="px-2.5 py-1 text-xs font-medium gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                    <span>{user?.fullName || (user?.role === 'CUSTOMER' ? 'Client' : user?.role)}</span>
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    title="Log out"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-4.5 w-4.5" strokeWidth={2.5} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomerModalOpen(true)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground h-9"
                >
                  <User className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
                  Client Sign In
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/provider/register')}
                  className="rounded-lg text-xs font-semibold shadow-subtle px-3.5 h-9"
                >
                  Register as a Pro
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
              className="h-9 w-9 rounded-lg"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" strokeWidth={2.5} /> : <Menu className="h-6 w-6" strokeWidth={2.5} />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-card px-5 py-4 shadow-dropdown md:hidden">
            <nav className="flex flex-col space-y-3">
              <Link
                to="/providers"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-foreground hover:text-primary py-1"
              >
                Find Technicians
              </Link>
              <Link
                to="/services"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-foreground hover:text-primary py-1"
              >
                Services
              </Link>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-foreground hover:text-primary py-1"
              >
                How It Works
              </a>
              <div className="border-t border-border pt-3">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    {user?.role === 'PROVIDER' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate('/provider/dashboard');
                        }}
                        className="w-full justify-start text-xs font-medium"
                      >
                        Provider Dashboard
                      </Button>
                    )}
                    {user?.role === 'ADMIN' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate('/admin/dashboard');
                        }}
                        className="w-full justify-start text-xs font-medium"
                      >
                        Admin Portal
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full justify-start text-xs text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" strokeWidth={2.5} />
                      Log Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setCustomerModalOpen(true);
                      }}
                      className="w-full justify-start text-xs font-medium"
                    >
                      <User className="mr-2 h-4 w-4" strokeWidth={2.5} />
                      Client Sign In / Register
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/provider/register');
                      }}
                      className="w-full text-xs font-semibold"
                    >
                      Register as a Provider
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Client Authentication Modal */}
      <CustomerAuthModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
      />
    </>
  );
}
