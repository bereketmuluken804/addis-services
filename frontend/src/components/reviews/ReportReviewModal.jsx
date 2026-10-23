import React, { useState } from 'react';
import { Flag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useReportReview } from '@/hooks/useReviews';

export function ReportReviewModal({ isOpen, onClose, review, providerId }) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const { mutateAsync: reportReview, isPending } = useReportReview(providerId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Please provide a reason for reporting this review.');
      return;
    }

    try {
      await reportReview({
        reviewId: review.id,
        reason: reason.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setReason('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please try again.');
    }
  };

  if (!review) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-8">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <Flag className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">Report Review</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center mt-1">
            Help our moderation team keep Addis Services trustworthy and respectful.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h4 className="font-heading text-lg font-bold">Report Submitted</h4>
            <p className="text-sm text-muted-foreground">
              Thank you. Our moderation team will review this report shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="flex items-start space-x-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reason for Report
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain why this review is misleading, abusive, spam, or violates guidelines..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-input bg-card p-3.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending} className="rounded-xl font-bold">
                {isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
