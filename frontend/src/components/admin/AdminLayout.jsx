import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStats } from '@/hooks/useAdminPortal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  PhoneCall,
  MessageSquare,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

export function AdminLayout({ children }) {
  const { user, isAuthenticated, isInitializing, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: stats } = useAdminStats();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isInitializing && (!isAuthenticated || user?.role !== 'ADMIN')) {
      navigate('/admin/login', { replace: true, state: { from: location.pathname } });
    }
  }, [isAuthenticated, isInitializing, user, navigate, location.pathname]);

  if (isInitializing || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Authenticating admin session...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const pendingVerificationsCount = stats?.providers?.pending ?? 0;

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      to: '/admin/verifications',
      label: 'Verifications',
      icon: ShieldCheck,
      badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      to: '/admin/providers',
      label: 'Providers',
      icon: Users,
    },
    {
      to: '/admin/phone-requests',
      label: 'Phone Requests',
      icon: PhoneCall,
    },
    {
      to: '/admin/reviews',
      label: 'Reviews',
      icon: MessageSquare,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Admin Notice Bar */}
      <div className="border-b border-border/60 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <span className="font-heading text-base font-bold tracking-tight text-foreground">
                Admin Console
              </span>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex border-primary/20 bg-primary/5 text-xs text-primary font-medium">
              Internal Ops
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-foreground">{user?.email}</span>
              <span className="text-[11px] text-muted-foreground capitalize">{user?.role}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive gap-1.5 text-xs font-medium rounded-lg"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Sidebar Navigation */}
          <aside className={`lg:col-span-1 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <nav className="flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-white p-3 shadow-sm">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Management
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          isActive ? 'bg-white text-primary' : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}

              <div className="my-2 border-t border-border/40" />

              <a
                href="/providers"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-slate-100 hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Public Directory
                </span>
              </a>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-4 min-h-[500px]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
