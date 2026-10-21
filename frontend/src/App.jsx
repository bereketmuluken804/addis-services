import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { HomePage } from '@/pages/public/HomePage';
import { DirectoryPage } from '@/pages/public/DirectoryPage';
import { ServicesPage } from '@/pages/public/ServicesPage';
import { ProviderDetailPage } from '@/pages/public/ProviderDetailPage';
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
              <Route path="/" element={<HomePage />} />
              <Route path="/providers" element={<DirectoryPage />} />
              <Route path="/providers/:id" element={<ProviderDetailPage />} />
              <Route path="/services" element={<ServicesPage />} />
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
