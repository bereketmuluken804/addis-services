import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  usePendingProviders,
  useTransitionVerification,
  useVerificationDocument,
  useUpdateActivation,
} from '@/hooks/useAdminPortal';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Check,
  X,
  ExternalLink,
  RotateCcw,
  Clock,
  MapPin,
  Briefcase,
  AlertCircle,
  Eye,
} from 'lucide-react';

export function AdminVerificationsPage() {
  const [page, setPage] = useState(1);
  const { data: pendingData, isLoading, refetch } = usePendingProviders({ page, limit: 10 });
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();

  const transitionMutation = useTransitionVerification();
  const activationMutation = useUpdateActivation();

  // Selected provider for document view or reject modal
  const [inspectingProvider, setInspectingProvider] = useState(null);
  const [rejectingProvider, setRejectingProvider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState('');

  // Document query for the inspecting provider
  const {
    data: docData,
    isLoading: docLoading,
    error: docError,
  } = useVerificationDocument(inspectingProvider?.id, Boolean(inspectingProvider));

  const providers = pendingData?.data || [];
  const pagination = pendingData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const getCategoryName = (catId) => {
    return categories.find((c) => c.id === catId)?.nameEn || `Category #${catId}`;
  };

  const getLocationLabel = (cityId, subCityId, woreda) => {
    const city = locations.find((c) => c.id === cityId);
    const subCity = city?.subCities?.find((s) => s.id === subCityId);
    const parts = [];
    if (subCity) parts.push(subCity.nameEn);
    if (woreda) parts.push(`Woreda ${woreda}`);
    return parts.length ? parts.join(', ') : 'Addis Ababa';
  };

  const handleApprove = async (providerId) => {
    setActionError('');
    try {
      await transitionMutation.mutateAsync({
        providerId,
        status: 'APPROVED',
      });
      await activationMutation.mutateAsync({
        providerId,
        isActive: true,
      });
      if (inspectingProvider?.id === providerId) {
        setInspectingProvider(null);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to approve provider.');
    }
  };

  const handleOpenReject = (provider) => {
    setRejectingProvider(provider);
    setRejectionReason('');
    setActionError('');
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setActionError('A rejection reason is required to notify the provider.');
      return;
    }

    try {
      await transitionMutation.mutateAsync({
        providerId: rejectingProvider.id,
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      setRejectingProvider(null);
      if (inspectingProvider?.id === rejectingProvider.id) {
        setInspectingProvider(null);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to reject verification.');
    }
  };

  const handleReopen = async (providerId) => {
    setActionError('');
    try {
      await transitionMutation.mutateAsync({
        providerId,
        status: 'REOPENED',
      });
      if (inspectingProvider?.id === providerId) {
        setInspectingProvider(null);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to reopen verification.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Provider Verifications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review submitted government-issued identity documents and approve or reject provider listings.
            </p>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-1 font-semibold">
            {pagination.total} Pending
          </Badge>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-4 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Pending Providers List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 border border-border/40" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <Card className="rounded-3xl border-border/60 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground">All Caught Up!</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              There are currently no provider identity documents waiting for review. New registrations will appear here automatically.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {providers.map((p) => (
              <Card
                key={p.id}
                className="rounded-2xl border-border/60 p-5 sm:p-6 shadow-sm hover:border-primary/40 transition-all bg-white"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Provider Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {p.fullName}
                      </h3>
                      <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-transparent">
                        {getCategoryName(p.categoryId)}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-800 font-semibold">
                        PENDING
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                        {p.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {getLocationLabel(p.cityId, p.subCityId, p.woreda)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                        {p.experienceYears} {p.experienceYears === 1 ? 'year' : 'years'} exp.
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Registered {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectingProvider(p)}
                      className="rounded-xl border-border/80 gap-1.5 text-xs font-semibold"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect Document
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      disabled={transitionMutation.isPending}
                      onClick={() => handleApprove(p.id)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={transitionMutation.isPending}
                      onClick={() => handleOpenReject(p)}
                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5 text-xs font-semibold"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={transitionMutation.isPending}
                      onClick={() => handleReopen(p.id)}
                      className="rounded-xl text-muted-foreground hover:text-foreground text-xs font-medium gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reopen
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Document Inspection Modal */}
        <Dialog open={Boolean(inspectingProvider)} onOpenChange={(open) => !open && setInspectingProvider(null)}>
          <DialogContent className="max-w-2xl rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <DialogTitle className="font-heading text-lg font-bold">
                  Identity Document Review
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Provider: <span className="font-semibold text-foreground">{inspectingProvider?.fullName}</span> ({inspectingProvider?.phone})
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-4">
              <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-800">
                <span className="font-semibold">Security Protocol (spec §3.2, §6.6):</span> ID documents reside in private storage. Signed URL is generated on-demand with 120s TTL and logged to audit trail.
              </div>

              {docLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-slate-50">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-xs text-muted-foreground">Fetching secure signed URL...</span>
                </div>
              ) : docError ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <span className="text-xs font-semibold text-destructive">
                    {docError.message || 'Unable to retrieve document.'}
                  </span>
                </div>
              ) : docData?.signedUrl ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-slate-900/5 flex items-center justify-center min-h-[300px] max-h-[460px]">
                    <img
                      src={docData.signedUrl}
                      alt="Provider verification document"
                      className="max-h-[460px] w-auto object-contain rounded-xl"
                      onError={(e) => {
                        // Fallback if not an image (e.g., PDF)
                        e.currentTarget.style.display = 'none';
                        const linkEl = document.getElementById('doc-external-link');
                        if (linkEl) linkEl.style.display = 'inline-flex';
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Expires in {docData.expiresInSeconds || 120}s</span>
                    <a
                      id="doc-external-link"
                      href={docData.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      Open document in new tab
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-100 p-8 text-center text-xs text-muted-foreground">
                  No active document record found.
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setInspectingProvider(null)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const prov = inspectingProvider;
                  setInspectingProvider(null);
                  handleOpenReject(prov);
                }}
                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
              >
                Reject Document...
              </Button>
              <Button
                variant="default"
                disabled={transitionMutation.isPending || !docData?.signedUrl}
                onClick={() => handleApprove(inspectingProvider.id)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Approve Verification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Modal with Mandatory Reason */}
        <Dialog open={Boolean(rejectingProvider)} onOpenChange={(open) => !open && setRejectingProvider(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="h-5 w-5" />
                <DialogTitle className="font-heading text-lg font-bold">
                  Reject Verification
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Explain why <span className="font-semibold text-foreground">{rejectingProvider?.fullName}</span>'s document was rejected. This reason will be shown to the provider in their portal.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rejection Reason (Required)
              </label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Expired Kebele ID, photo blurry, or name mismatch"
                className="rounded-xl"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Per Invariant #3: Rejecting verification sets provider isActive to false and closes listing.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectingProvider(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={transitionMutation.isPending || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="rounded-xl text-xs font-semibold"
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
