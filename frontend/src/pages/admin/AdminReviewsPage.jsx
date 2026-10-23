import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminReviews, useModerateReview } from '@/hooks/useAdminPortal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Search,
  Star,
  EyeOff,
  Eye,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  User,
  Clock,
  ExternalLink,
  Flag,
} from 'lucide-react';

export function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState('reported'); // 'reported' | 'all'
  const [providerIdFilter, setProviderIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Queries
  const { data: reviewsData, isLoading, refetch } = useAdminReviews({
    reportedOnly: activeTab === 'reported' ? 'true' : 'false',
    status: statusFilter,
    providerId: providerIdFilter.trim() ? Number(providerIdFilter.trim()) : undefined,
    page,
    limit: 15,
  });

  const moderateMutation = useModerateReview();

  // Moderation modal state
  const [targetReview, setTargetReview] = useState(null);
  const [targetAction, setTargetAction] = useState(null); // 'HIDE' | 'PUBLISH'
  const [moderationReason, setModerationReason] = useState('');
  const [actionError, setActionError] = useState('');

  const reviews = reviewsData?.data || [];
  const pagination = reviewsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleOpenModeration = (review, action) => {
    setTargetReview(review);
    setTargetAction(action);
    setModerationReason('');
    setActionError('');
  };

  const handleConfirmModeration = async () => {
    if (!moderationReason.trim()) {
      setActionError('A moderation reason is required for administrative audit logs.');
      return;
    }

    try {
      await moderateMutation.mutateAsync({
        reviewId: targetReview.id,
        status: targetAction === 'HIDE' ? 'HIDDEN' : 'PUBLISHED',
        reason: moderationReason.trim(),
      });

      setTargetReview(null);
      setTargetAction(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to moderate review.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Review Moderation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enforce community guidelines. Reviews can be hidden or republished with required moderator notes. Author rating and text cannot be altered.
          </p>
        </div>

        {/* Tab & Filter Controls */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
            {/* Queue Switcher */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reported');
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === 'reported'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                Reported Queue
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                All Customer Reviews
              </button>
            </div>

            {/* Filter by Provider ID */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Filter by Provider ID..."
                value={providerIdFilter}
                onChange={(e) => {
                  setProviderIdFilter(e.target.value);
                  setPage(1);
                }}
                className="w-48 h-9 text-xs rounded-xl"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {actionError}
          </div>
        )}

        {/* Reviews List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 border-border bg-card shadow-subtle rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card className="rounded-3xl border-border/60 p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              {activeTab === 'reported' ? 'No Reported Reviews' : 'No Reviews Found'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeTab === 'reported'
                ? 'Great news! There are no customer reviews flagged for community moderation right now.'
                : 'No reviews match your selected filters.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const isHidden = rev.status === 'HIDDEN';
              const hasReports = rev.reportCount > 0;

              return (
                <Card
                  key={rev.id}
                  className="rounded-2xl border-border/60 p-5 shadow-xs hover:border-primary/40 transition-all bg-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Top Meta Line */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-mono font-bold text-muted-foreground">
                          Review #{rev.id}
                        </span>

                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-foreground">{rev.rating}.0</span>

                        <Badge
                          variant="outline"
                          className={
                            isHidden
                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          }
                        >
                          {rev.status}
                        </Badge>

                        {hasReports && (
                          <Badge variant="destructive" className="text-[11px] font-semibold gap-1">
                            <Flag className="h-3 w-3" /> Flagged ({rev.reportCount} report{rev.reportCount > 1 ? 's' : ''})
                          </Badge>
                        )}
                      </div>

                      {/* Comment text */}
                      <p className="text-sm text-foreground italic bg-muted/30 p-3 rounded-xl border border-border/50">
                        "{rev.comment || 'No comment text provided'}"
                      </p>

                      {/* Author & Provider Info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-primary" />
                          Author: {rev.customerName || `Customer #${rev.customerId}`}
                        </span>
                        <span>
                          For Provider: <strong>{rev.providerName}</strong> (#{rev.providerId})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Moderation audit info if hidden */}
                      {rev.moderationReason && (
                        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200/60 rounded-xl px-3 py-1.5 mt-2">
                          <span className="font-semibold">Moderation Note:</span> {rev.moderationReason}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <a
                        href={`/providers/${rev.providerId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex"
                      >
                        <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1">
                          <ExternalLink className="h-3.5 w-3.5" /> Pro Page
                        </Button>
                      </a>

                      {isHidden ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModeration(rev, 'PUBLISH')}
                          className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Publish Review
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModeration(rev, 'HIDE')}
                          className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold gap-1.5"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          Hide Review
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

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

        {/* Moderation Confirmation Modal */}
        <Dialog open={Boolean(targetReview)} onOpenChange={(open) => !open && setTargetReview(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {targetAction === 'HIDE' ? <EyeOff className="h-6 w-6 text-rose-600" /> : <Eye className="h-6 w-6 text-emerald-600" />}
              </div>
              <DialogTitle className="text-center font-heading text-lg font-bold">
                {targetAction === 'HIDE' ? 'Hide Review from Public Listing' : 'Restore / Publish Review'}
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                {targetAction === 'HIDE'
                  ? 'Hiding this review will remove its rating from the provider’s public score and hide its text from the public directory.'
                  : 'Publishing will restore this review’s score and make its text visible to public visitors.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-3">
              <label className="text-xs font-semibold text-foreground">
                Moderation Reason (Required for Audit Logs)
              </label>
              <Input
                placeholder="e.g. Inappropriate language, off-topic spam, resolved dispute..."
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            {actionError && (
              <div className="rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {actionError}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                variant="outline"
                onClick={() => setTargetReview(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant={targetAction === 'HIDE' ? 'destructive' : 'default'}
                disabled={moderateMutation.isPending}
                onClick={handleConfirmModeration}
                className="rounded-xl text-xs font-semibold"
              >
                {moderateMutation.isPending ? (
                  <span className="flex items-center">
                    <Spinner size="xs" className="mr-1.5 text-white border-white border-t-transparent" />
                    Updating...
                  </span>
                ) : targetAction === "HIDE" ? (
                  "Confirm Hide"
                ) : (
                  "Confirm Publish"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
