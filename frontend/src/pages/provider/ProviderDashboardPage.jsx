import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  PhoneCall,
  Star,
  Clock,
  AlertTriangle,
  XCircle,
  User,
  Lock,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { useProviderMe, useUpdateAvailability } from '@/hooks/useProviderPortal';
import { useAuthStore } from '@/stores/authStore';
import { DocumentResubmitModal } from '@/components/provider/DocumentResubmitModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProviderDashboardPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: provider, isLoading: isProviderLoading } = useProviderMe();
  const { mutate: updateAvailability, isPending: isUpdatingAvailability } = useUpdateAvailability();

  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'PROVIDER') {
    return <Navigate to="/provider/login" replace />;
  }

  if (isProviderLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </div>
    );
  }

  const isApproved = provider?.verificationStatus === 'APPROVED';
  const isPending = provider?.verificationStatus === 'PENDING';
  const isRejected = provider?.verificationStatus === 'REJECTED';
  const isRevoked = provider?.verificationStatus === 'REVOKED';

  const displayName = (provider?.fullName || user?.fullName || '').trim();
  const firstName = displayName ? displayName.split(' ')[0] : (user?.phone || 'Provider');

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Welcome & Availability Control */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-border pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Welcome, {firstName}
            </h1>
            
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {provider?.category?.nameEn || provider?.categoryName} • {provider?.subCity?.nameEn || provider?.subCityName}
          </p>

          {/* Big Directory Status Text Badge (No Box) */}
          <div className="mt-3 flex items-center gap-2">
            {isApproved && provider?.isActive ? (
              <span className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3.5 py-1 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white shadow-xs">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                DIRECTORY STATUS: LISTED (APPROVED & ACTIVE)
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3.5 py-1 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white shadow-xs">
                DIRECTORY STATUS: NOT LISTED {isPending ? '(PENDING ID REVIEW)' : isRejected ? '(DOCUMENT REJECTED)' : isRevoked ? '(VERIFICATION REVOKED)' : '(INACTIVE)'}
              </span>
            )}
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center space-x-3 rounded-lg border border-border bg-card px-3.5 py-2 shadow-subtle">
          <div>
            <span className="block text-[11px] text-muted-foreground font-medium">Status</span>
            <span className="text-xs font-semibold text-foreground">
              {provider?.isAvailable ? 'Available for Calls' : 'Marked Offline'}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={provider?.isAvailable}
            disabled={isUpdatingAvailability}
            onClick={() => updateAvailability(!provider?.isAvailable)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${
              provider?.isAvailable ? 'bg-emerald-600' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                provider?.isAvailable ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Verification Status Alert Banners */}
      {isPending && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-subtle space-y-1.5">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>ID Verification In Review</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Our admin team is currently reviewing your uploaded ID document. Your listing will automatically appear in directory searches once approved.
          </p>
          <div className="pt-1">
            <Link to="/provider/documents">
              <Button variant="outline" size="sm" className="h-7 text-xs rounded border-amber-300 font-medium">
                View Document Status
              </Button>
            </Link>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive shadow-subtle space-y-2">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <XCircle className="h-4 w-4" />
            <span>ID Document Rejected</span>
          </div>
          <p className="text-xs leading-relaxed">
            {provider?.verificationRejectionReason ||
              'Your ID document could not be verified (e.g. illegible photo or mismatched information).'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setResubmitModalOpen(true)}
              className="h-8 text-xs font-semibold rounded-md"
            >
              Re-submit Clear ID Document
            </Button>
            <Link to="/provider/documents">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium rounded-md">
                Document Details
              </Button>
            </Link>
          </div>
        </div>
      )}

      {isRevoked && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive shadow-subtle space-y-1.5">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Verification Suspended</span>
          </div>
          <p className="text-xs leading-relaxed">
            Your verification status was revoked by an administrator. Please contact support.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5 border-border shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Inquiries
            </span>
            <PhoneCall className="h-5 w-5 text-primary" />
          </div>
          <span className="mt-3 block font-heading text-3xl font-extrabold text-foreground">
            {provider?.totalCallsReceived || 0}
          </span>
          <span className="text-xs text-muted-foreground mt-1 block">
            Direct telephone clicks from clients
          </span>
        </Card>

        <Card className="p-5 border-border shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Client Rating
            </span>
            <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
          </div>
          <span className="mt-3 block font-heading text-3xl font-extrabold text-foreground">
            {provider?.averageRating ? Number(provider.averageRating).toFixed(1) : '—'}
          </span>
          <span className="text-xs text-muted-foreground mt-1 block">
            From {provider?.reviewCount || 0} customer reviews
          </span>
        </Card>
      </div>

      {/* Navigation Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 flex flex-col justify-between border-border shadow-subtle">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">Profile & Bio</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Update your biography, years of trade experience, work samples, and woreda.
            </p>
          </div>
          <Link to="/provider/profile" className="mt-4">
            <Button variant="outline" size="sm" className="w-full text-xs font-semibold justify-between h-8 rounded-md">
              <span>Edit Profile</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-border shadow-subtle">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">Verification Documents</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              View current verification status or upload a replacement National ID document.
            </p>
          </div>
          <Link to="/provider/documents" className="mt-4">
            <Button variant="outline" size="sm" className="w-full text-xs font-semibold justify-between h-8 rounded-md">
              <span>View Documents</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-border shadow-subtle">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Lock className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">Account Security</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Change account password or submit an admin-approved mobile phone update.
            </p>
          </div>
          <Link to="/provider/security" className="mt-4">
            <Button variant="outline" size="sm" className="w-full text-xs font-semibold justify-between h-8 rounded-md">
              <span>Security Settings</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Resubmit Modal */}
      <DocumentResubmitModal
        isOpen={resubmitModalOpen}
        onClose={() => setResubmitModalOpen(false)}
      />
    </div>
  );
}
