import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { HomePage } from '@/pages/public/HomePage';
import { DirectoryPage } from '@/pages/public/DirectoryPage';
import { ServicesPage } from '@/pages/public/ServicesPage';
import { ProviderDetailPage } from '@/pages/public/ProviderDetailPage';
import { ProviderRegisterPage } from '@/pages/provider/ProviderRegisterPage';
import { ProviderLoginPage } from '@/pages/provider/ProviderLoginPage';
import { ProviderDashboardPage } from '@/pages/provider/ProviderDashboardPage';
import { ProviderProfilePage } from '@/pages/provider/ProviderProfilePage';
import { ProviderSecurityPage } from '@/pages/provider/ProviderSecurityPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminVerificationsPage } from '@/pages/admin/AdminVerificationsPage';
import { AdminProvidersPage } from '@/pages/admin/AdminProvidersPage';
import { AdminPhoneRequestsPage } from '@/pages/admin/AdminPhoneRequestsPage';
import { AdminReviewsPage } from '@/pages/admin/AdminReviewsPage';
import { CallLeadModal } from '@/components/public/CallLeadModal';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-32 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-muted text-muted-foreground mb-6">
        <Search className="h-10 w-10" />
      </div>
      <h1 className="font-heading text-4xl font-extrabold text-foreground">Page Not Found</h1>
      <p className="mt-3 text-base text-muted-foreground max-w-md mx-auto">
        The page you are looking for doesn't exist or has moved.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link to="/">
          <Button variant="default" className="rounded-xl font-semibold">
            Back to Homepage
          </Button>
        </Link>
        <Link to="/providers">
          <Button variant="outline" className="rounded-xl font-semibold">
            Find Service Providers
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  const checkSession = useAuthStore((state) => state.checkSession);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
          <Navbar />
          <div className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/providers" element={<DirectoryPage />} />
              <Route path="/providers/:id" element={<ProviderDetailPage />} />
              <Route path="/services" element={<ServicesPage />} />

              {/* Provider Portal Routes */}
              <Route path="/provider" element={<Navigate to="/provider/dashboard" replace />} />
              <Route path="/provider/register" element={<ProviderRegisterPage />} />
              <Route path="/provider/login" element={<ProviderLoginPage />} />
              <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
              <Route path="/provider/profile" element={<ProviderProfilePage />} />
              <Route path="/provider/security" element={<ProviderSecurityPage />} />

              {/* Admin Console Routes */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
              <Route path="/admin/providers" element={<AdminProvidersPage />} />
              <Route path="/admin/phone-requests" element={<AdminPhoneRequestsPage />} />
              <Route path="/admin/reviews" element={<AdminReviewsPage />} />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
          <Footer />
          <CallLeadModal />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
