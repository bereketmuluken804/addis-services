import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminPhoneRequests, useDecidePhoneRequest } from '@/hooks/useAdminPortal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PhoneCall,
  Check,
  X,
  Clock,
  ArrowRight,
  AlertCircle,
  ShieldAlert,
  Phone,
  User,
} from 'lucide-react';

export function AdminPhoneRequestsPage() {
  const [selectedStatus, setSelectedStatus] = useState('PENDING');
  const [page, setPage] = useState(1);

  const { data: requestsData, isLoading, refetch } = useAdminPhoneRequests({
    status: selectedStatus,
    page,
    limit: 10,
  });

  const decideMutation = useDecidePhoneRequest();

  // Modals
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState('');

  const requests = requestsData?.data || [];
  const pagination = requestsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleApprove = async (requestId) => {
    setActionError('');
    try {
      await decideMutation.mutateAsync({
        requestId,
        status: 'APPROVED',
      });
    } catch (err) {
      setActionError(err.message || 'Failed to approve phone change.');
    }
  };

  const handleOpenReject = (req) => {
    setRejectingRequest(req);
    setRejectionReason('');
    setActionError('');
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setActionError('A rejection reason is required to notify the provider.');
      return;
    }

    try {
      await decideMutation.mutateAsync({
        requestId: rejectingRequest.id,
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      setRejectingRequest(null);
    } catch (err) {
      setActionError(err.message || 'Failed to reject phone change.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Phone Change Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Provider mobile phone numbers are strictly verified. Review and authorize business number changes.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 border-b border-border/60 pb-3">
          {['PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st);
                setPage(1);
              }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                selectedStatus === st
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
              }`}
            >
              {st === 'PENDING' ? 'Pending Review' : st === 'APPROVED' ? 'Approved History' : 'Rejected'}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-4 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Requests List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 border-border bg-card shadow-subtle rounded-lg">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card className="rounded-3xl border-border/60 p-12 text-center">
            <PhoneCall className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              No {selectedStatus.toLowerCase()} requests
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedStatus === 'PENDING'
                ? 'All pending phone change requests have been processed.'
                : `There are no requests marked as ${selectedStatus.toLowerCase()}.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <Card
                key={req.id}
                className="rounded-2xl border-border/60 p-5 sm:p-6 shadow-sm hover:border-primary/40 transition-all bg-white"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Left Details */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-heading text-base font-bold text-foreground">
                        {req.providerName}
                      </h3>
                      <span className="text-xs font-mono text-muted-foreground">
                        (Provider #{req.providerId})
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          req.status === 'APPROVED'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'border-rose-300 bg-rose-50 text-rose-800'
                            : 'border-amber-300 bg-amber-50 text-amber-800'
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>

                    {/* Phone Transfer Flow */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono font-medium text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {req.currentPhone}
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 font-mono font-bold text-primary">
                        <Phone className="h-3 w-3" />
                        {req.requestedPhone}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-muted-foreground bg-slate-50 rounded-xl p-3">
                      <span className="font-semibold text-foreground">Reason provided: </span>
                      "{req.reason || 'No specific reason provided'}"
                    </div>

                    {req.rejectionReason && (
                      <div className="text-xs text-rose-700 bg-rose-50 rounded-xl p-3 border border-rose-200">
                        <span className="font-semibold">Rejection reason: </span>
                        "{req.rejectionReason}"
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Submitted: {new Date(req.createdAt).toLocaleString()}
                      </span>
                      {req.reviewedAt && (
                        <span>• Reviewed: {new Date(req.reviewedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions for PENDING */}
                  {req.status === 'PENDING' && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Button
                        variant="default"
                        size="sm"
                        disabled={decideMutation.isPending}
                        onClick={() => handleApprove(req.id)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve Phone Change
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={decideMutation.isPending}
                        onClick={() => handleOpenReject(req)}
                        className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5 text-xs font-semibold"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject...
                      </Button>
                    </div>
                  )}
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

        {/* Reject Modal */}
        <Dialog open={Boolean(rejectingRequest)} onOpenChange={(open) => !open && setRejectingRequest(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="h-5 w-5" />
                <DialogTitle className="font-heading text-lg font-bold">
                  Reject Phone Change
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                State the reason for rejecting <span className="font-semibold text-foreground">{rejectingRequest?.providerName}</span>'s phone change request.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rejection Reason (Required)
              </label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Number could not be verified or identity unconfirmed"
                className="rounded-xl"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectingRequest(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={decideMutation.isPending || !rejectionReason.trim()}
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
