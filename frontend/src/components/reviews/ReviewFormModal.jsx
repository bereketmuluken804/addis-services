import React, { useState, useEffect } from 'react';
import { Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCreateReview, useUpdateReview } from '@/hooks/useReviews';

export function ReviewFormModal({ isOpen, onClose, provider, initialReview = null }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);

  const { mutateAsync: createReview, isPending: isCreating } = useCreateReview(provider?.id);
  const { mutateAsync: updateReview, isPending: isUpdating } = useUpdateReview(provider?.id);

  const isEditing = !!initialReview;
  const isSubmitting = isCreating || isUpdating;

  useEffect(() => {
    if (initialReview) {
      setRating(initialReview.rating);
      setComment(initialReview.comment || '');
    } else {
      setRating(5);
      setComment('');
    }
    setError(null);
  }, [initialReview, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (comment.trim().length < 5) {
      setError('Please write at least a few words describing your experience.');
      return;
    }

    try {
      if (isEditing) {
        await updateReview({
          reviewId: initialReview.id,
          rating,
          comment: comment.trim(),
        });
      } else {
        await createReview({
          rating,
          comment: comment.trim(),
        });
      }
      onClose();
    } catch (err) {
      if (err.code === 'DUPLICATE_REVIEW') {
        setError('You have already submitted a review for this service provider.');
      } else {
        setError(err.message || 'Failed to submit review. Please try again.');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? 'Edit Your Review' : `Review ${provider?.fullName}`}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Your honest feedback helps fellow residents in Addis Ababa find reliable technicians.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mt-3 flex items-start space-x-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* Star Rating Interactive Selector */}
          <div className="space-y-2 text-center">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your Rating
            </label>
            <div className="flex items-center justify-center space-x-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} star`}
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-border hover:text-amber-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="block text-xs font-semibold text-muted-foreground">
              {rating === 5 && 'Outstanding service'}
              {rating === 4 && 'Very good experience'}
              {rating === 3 && 'Average / satisfactory'}
              {rating === 2 && 'Disappointing service'}
              {rating === 1 && 'Poor experience'}
            </span>
          </div>

          {/* Comment Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your Review & Comments
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the job done, punctuality, fair pricing, and overall quality of work..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-2xl border border-input bg-card p-4 text-sm leading-relaxed outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-12 rounded-xl font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 rounded-xl font-bold shadow-sm"
            >
              {isSubmitting ? 'Submitting...' : isEditing ? 'Save Changes' : 'Post Review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
