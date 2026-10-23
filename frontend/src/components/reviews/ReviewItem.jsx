import React, { useState } from 'react';
import { Star, Flag, Trash2, Edit3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useDeleteReview } from '@/hooks/useReviews';

export function ReviewItem({ review, providerId, onEdit, onReport }) {
  const { user } = useAuthStore();
  const { mutateAsync: deleteReview, isPending: isDeleting } = useDeleteReview(providerId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Is current logged in user the author of this review?
  const isOwner = Boolean(
    review.isOwner || (user?.role === 'CUSTOMER' && review.customerId && user?.id === review.customerId)
  );
  const authorName = review.reviewerName || review.customerName || 'Verified Client';

  const formattedDate = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const handleDelete = async () => {
    try {
      setDeleteError(null);
      await deleteReview(review.id);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete review');
    }
  };

  return (
    <Card className="p-4 border-border bg-card shadow-subtle rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light font-heading text-xs font-bold text-primary shrink-0 border border-primary/20">
            {authorName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="font-heading text-sm font-bold text-foreground">
              {authorName}
            </h4>
            <div className="flex items-center space-x-2 pt-0.5">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3 w-3 ${s <= review.rating ? 'fill-amber-400' : 'text-border'}`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center space-x-1">
          {isOwner ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(review)}
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded"
              >
                <Edit3 className="mr-1 h-3 w-3" />
                Edit
              </Button>
              {confirmDelete ? (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="h-7 px-2 text-xs font-semibold rounded"
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    className="h-7 px-1.5 text-xs rounded"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive rounded"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReport(review)}
              title="Report review"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded"
            >
              <Flag className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="mt-2 text-[11px] text-destructive bg-destructive/5 border border-destructive/20 p-2 rounded">
          {deleteError}
        </div>
      )}
      <p className="mt-2.5 text-xs text-foreground/85 leading-relaxed font-normal">
        {review.comment}
      </p>
    </Card>
  );
}
