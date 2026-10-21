import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  PhoneCall,
  Star,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useProviderMe, useUpdateAvailability } from '@/hooks/useProviderPortal';
import { useAuthStore } from '@/stores/authStore';
import { DocumentResubmitModal } from '@/components/provider/DocumentResubmitModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProviderDashboardPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: provider, isLoading: isProviderLoading } = useProviderMe();
  const { mutate: updateAvailability, isPending: isUpdatingAvailability } = useUpdateAvailability();

  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'PROVIDER') {
    return <Navigate to="/provider/login" replace />;
  }

  if (isProviderLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isApproved = provider?.verificationStatus === 'APPROVED';
  const isPending = provider?.verificationStatus === 'PENDING';
  const isRejected = provider?.verificationStatus === 'REJECTED';
  const isRevoked = provider?.verificationStatus === 'REVOKED';

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl space-y-10">
      {/* Welcome & Availability Control */}
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center border-b border-border/80 pb-8">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Welcome, {provider?.fullName?.split(' ')[0]}
            </h1>
            {isApproved && (
              <span title="Verified Professional">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {provider?.category?.nameEn || provider?.categoryName} • {provider?.subCity?.nameEn || provider?.subCityName}
          </p>
        </div>

        {/* Optimistic Availability Toggle Switch */}
        <div className="flex items-center space-x-4 rounded-2xl border border-border/80 bg-card p-4 shadow-subtle">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Availability Badge
            </span>
            <span className="text-sm font-bold text-foreground">
              {provider?.isAvailable ? 'Available for Work' : 'Currently Busy / Offline'}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={provider?.isAvailable}
            disabled={isUpdatingAvailability}
            onClick={() => updateAvailability(!provider?.isAvailable)}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
              provider?.isAvailable ? 'bg-emerald-600' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                provider?.isAvailable ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Verification Status Alert Banners */}
      {isPending && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-amber-900 shadow-xs space-y-2">
          <div className="flex items-center space-x-2 font-bold text-base">
            <Clock className="h-5 w-5 text-amber-600" />
            <span>Verification In Review</span>
          </div>
          <p className="text-sm leading-relaxed text-amber-800">
            Our admin team is currently reviewing your uploaded ID document. Your profile will automatically appear in public search listings once approved.
          </p>
        </div>
      )}

      {isRejected && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-destructive shadow-xs space-y-3">
          <div className="flex items-center space-x-2 font-bold text-base">
            <XCircle className="h-5 w-5" />
            <span>Verification Rejected</span>
          </div>
          <p className="text-sm leading-relaxed">
            {provider?.verificationRejectionReason ||
              'Your ID document could not be verified (e.g. blurry image or expired document).'}
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setResubmitModalOpen(true)}
            className="rounded-xl font-bold mt-1"
          >
            Re-submit Clear ID Document
          </Button>
        </div>
      )}

      {isRevoked && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-destructive shadow-xs space-y-2">
          <div className="flex items-center space-x-2 font-bold text-base">
            <AlertTriangle className="h-5 w-5" />
            <span>Verification Suspended / Revoked</span>
          </div>
          <p className="text-sm leading-relaxed">
            Your verification status was revoked by an administrator. Please contact support.
          </p>
        </div>
      )}

      {/* KPI Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="p-7">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Direct Calls
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
              <PhoneCall className="h-5 w-5" />
            </div>
          </div>
          <span className="mt-4 block font-heading text-4xl font-extrabold text-foreground">
            {provider?.totalCallsReceived || 0}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Call clicks received from customers
          </span>
        </Card>

        <Card className="p-7">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Average Rating
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Star className="h-5 w-5 fill-amber-400" />
            </div>
          </div>
          <span className="mt-4 block font-heading text-4xl font-extrabold text-foreground">
            {provider?.averageRating ? Number(provider.averageRating).toFixed(1) : '—'}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Across {provider?.reviewCount || 0} customer reviews
          </span>
        </Card>

        <Card className="p-7">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Public Visibility
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <span className="mt-4 block font-heading text-xl font-bold text-foreground">
            {isApproved && provider?.isActive ? 'Active & Listed' : 'Not Visible'}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {isApproved && provider?.isActive
              ? 'Appears in directory searches'
              : 'Requires approval & active state'}
          </span>
        </Card>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card className="p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <User className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl font-bold">Edit Profile & Portfolio</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Update your biography, years of experience, work sample photos, and service locations.
            </p>
          </div>
          <Link to="/provider/profile" className="mt-6">
            <Button variant="outline" className="w-full h-11 rounded-xl font-semibold justify-between">
              <span>Manage Profile</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>

        <Card className="p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <Lock className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl font-bold">Security & Phone Change</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Update your account password or submit an admin-approved request to change your registered phone number.
            </p>
          </div>
          <Link to="/provider/security" className="mt-6">
            <Button variant="outline" className="w-full h-11 rounded-xl font-semibold justify-between">
              <span>Security Settings</span>
              <ArrowRight className="h-4 w-4" />
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
