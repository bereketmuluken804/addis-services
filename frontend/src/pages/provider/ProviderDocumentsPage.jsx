import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useProviderMe } from '@/hooks/useProviderPortal';
import { useAuthStore } from '@/stores/authStore';
import { DocumentResubmitModal } from '@/components/provider/DocumentResubmitModal';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ProviderDocumentsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: provider, isLoading: isProviderLoading } = useProviderMe();
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'PROVIDER') {
    return <Navigate to="/provider/login" replace />;
  }

  if (isProviderLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
        <Skeleton className="h-4 w-28" />
        <Card className="p-6 border-border bg-card shadow-subtle rounded-lg space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-5 w-20 rounded" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </Card>
      </div>
    );
  }

  const status = provider?.verificationStatus || 'PENDING';
  const isApproved = status === 'APPROVED';
  const isPending = status === 'PENDING';
  const isRejected = status === 'REJECTED';
  const isRevoked = status === 'REVOKED';

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Link
        to="/provider/dashboard"
        className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Verification Documents
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track the identity review status of your government-issued credentials and submit replacement documents if requested.
        </p>
      </div>

      <Card className="p-8 sm:p-10 border-border/80 shadow-subtle space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between border-b border-border/70 pb-6">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Identity Status
            </span>
            <span className="font-heading text-xl font-bold text-foreground mt-0.5 block">
              {isApproved && 'Credentials Verified & Approved'}
              {isPending && 'Identity Under Review'}
              {isRejected && 'Document Rejected — Action Required'}
              {isRevoked && 'Verification Suspended / Revoked'}
            </span>
          </div>

          <Badge
            variant="outline"
            className={
              isApproved
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 text-xs px-3 py-1 font-bold'
                : isPending
                ? 'border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-1 font-bold'
                : 'border-rose-300 bg-rose-50 text-rose-800 text-xs px-3 py-1 font-bold'
            }
          >
            {status}
          </Badge>
        </div>

        {/* State Explanation Banner */}
        {isApproved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-900 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>Identity Verified</span>
            </div>
            <p className="text-xs leading-relaxed text-emerald-800">
              Your government ID credentials have been verified by the Addis Services admin team.
              {provider?.isActive
                ? ' Your listing is currently active and publicly listed in customer searches.'
                : ' Note: Your listing must also be active before it appears in public search.'}
            </p>
          </div>
        )}

        {isPending && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-6 text-amber-900 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <Clock className="h-5 w-5 text-amber-600" />
              <span>Document Awaiting Admin Review</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-800">
              Your National ID or Passport document is currently in the review queue. Verification reviews typically take less than 24 hours. Resubmission is not required while review is pending.
            </p>
          </div>
        )}

        {isRejected && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-destructive space-y-3">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <XCircle className="h-5 w-5" />
              <span>Rejection Reason</span>
            </div>
            <p className="text-xs leading-relaxed bg-white/80 p-3 rounded-lg border border-destructive/20">
              {provider?.verificationRejectionReason ||
                'The submitted document could not be clearly read, was cropped, or expired.'}
            </p>
            <p className="text-xs text-muted-foreground">
              Please take a clear, well-lit photograph of your original Kebele ID, Resident ID, or Passport and resubmit.
            </p>
            <Button
              onClick={() => setResubmitModalOpen(true)}
              className="rounded-md font-bold text-xs"
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload Replacement Document
            </Button>
          </div>
        )}

        {isRevoked && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive space-y-2">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <AlertTriangle className="h-5 w-4" />
              <span>Status Revoked</span>
            </div>
            <p className="text-xs leading-relaxed">
              Your identity verification was revoked by platform administrators. Uploading alone does not restore visibility. Please contact customer support.
            </p>
          </div>
        )}

        {/* Security & Vault Note */}
        <div className="rounded-lg bg-muted/60 p-4 text-xs text-muted-foreground space-y-1.5 border border-border/60">
          <p className="font-semibold text-foreground flex items-center">
            <ShieldCheck className="mr-1.5 h-4 w-4 text-primary" />
            Document Security & Privacy
          </p>
          <p>
            Your identification documents are stored in secure, private storage. They are strictly confidential, protected by platform encryption, and only accessible to authorized verification officers.
          </p>
        </div>
      </Card>

      <DocumentResubmitModal
        isOpen={resubmitModalOpen}
        onClose={() => setResubmitModalOpen(false)}
      />
    </div>
  );
}
