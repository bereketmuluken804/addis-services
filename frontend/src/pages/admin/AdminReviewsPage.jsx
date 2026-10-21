import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useModerateReview } from '@/hooks/useAdminPortal';
import { useProviderReviews } from '@/hooks/useReviews';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';

export function AdminReviewsPage() {
  const [providerIdInput, setProviderIdInput] = useState('1');
  const [activeProviderId, setActiveProviderId] = useState(1);
  const [reviewIdInput, setReviewIdInput] = useState('');
  const [directReview, setDirectReview] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [directError, setDirectError] = useState('');

  // Provider reviews query
  const { data: reviewsData, isLoading, refetch } = useProviderReviews(activeProviderId, { limit: 20 });
  const moderateMutation = useModerateReview();

  // Moderation modal state
  const [targetReview, setTargetReview] = useState(null);
  const [targetAction, setTargetAction] = useState(null); // 'HIDE' | 'PUBLISH'
  const [moderationReason, setModerationReason] = useState('');
  const [actionError, setActionError] = useState('');

  const reviews = reviewsData?.data || [];

  const handleSearchProvider = (e) => {
    e.preventDefault();
    if (!providerIdInput.trim()) return;
    setActiveProviderId(Number(providerIdInput.trim()));
    setDirectReview(null);
  };

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

      // Update direct review if viewing
      if (directReview && directReview.id === targetReview.id) {
        setDirectReview({
          ...directReview,
          status: targetAction === 'HIDE' ? 'HIDDEN' : 'PUBLISHED',
        });
      }

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
            Enforce community guidelines (spec §6.6). Reviews can be hidden or republished with mandatory audit reasoning. Author rating and text are immutable.
          </p>
        </div>

        {/* Provider Reviews Inspector Form */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchProvider} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={providerIdInput}
                onChange={(e) => setProviderIdInput(e.target.value)}
                placeholder="Enter Provider ID (e.g. 1)..."
                className="pl-10 rounded-xl"
              />
            </div>
            <Button type="submit" className="rounded-xl text-xs font-semibold px-5">
              Inspect Provider Reviews
            </Button>
          </form>
        </div>

        {actionError && (
          <div className="rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {actionError}
          </div>
        )}

        {/* Reviews List for Active Provider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-foreground">
              Reviews for Provider #{activeProviderId}
            </h2>
            <a
              href={`/providers/${activeProviderId}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              View Public Page
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <Card className="rounded-3xl border-border/60 p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-heading text-lg font-bold text-foreground">No Reviews Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Provider #{activeProviderId} has not received any published customer reviews yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <Card
                  key={rev.id}
                  className="rounded-2xl border-border/60 p-5 shadow-sm hover:border-primary/40 transition-all bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
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
                            rev.status === 'HIDDEN'
                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          }
                        >
                          {rev.status || 'PUBLISHED'}
                        </Badge>
                      </div>

                      <p className="text-sm text-foreground italic">
                        "{rev.comment || 'No written comment'}"
                      </p>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="h-3 w-3" />
                          {rev.customerName || 'Verified Customer'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Moderation Actions */}
                    <div className="flex items-center gap-2">
                      {rev.status === 'HIDDEN' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModeration(rev, 'PUBLISH')}
                          className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs font-semibold gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Republish
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
              ))}
            </div>
          )}
        </div>

        {/* Moderation Confirmation Dialog */}
        <Dialog open={Boolean(targetReview)} onOpenChange={(open) => !open && setTargetReview(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {targetAction === 'HIDE' ? (
                  <EyeOff className="h-5 w-5 text-rose-600" />
                ) : (
                  <Eye className="h-5 w-5 text-emerald-600" />
                )}
                <DialogTitle className="font-heading text-lg font-bold">
                  {targetAction === 'HIDE' ? 'Hide Customer Review' : 'Republish Customer Review'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Review #{targetReview?.id} by {targetReview?.customerName || 'Customer'}
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 text-xs italic text-foreground border border-border/60">
                "{targetReview?.comment || 'No comment text'}"
              </div>

              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Audit Reason (Required)
              </label>
              <Input
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder={
                  targetAction === 'HIDE'
                    ? 'e.g. Profanity, harassment, or competitor spam'
                    : 'e.g. Cleared after appeal or mistake'
                }
                className="rounded-xl"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setTargetReview(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant={targetAction === 'HIDE' ? 'destructive' : 'default'}
                disabled={moderateMutation.isPending || !moderationReason.trim()}
                onClick={handleConfirmModeration}
                className="rounded-xl text-xs font-semibold"
              >
                {targetAction === 'HIDE' ? 'Confirm Hide' : 'Confirm Republish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
