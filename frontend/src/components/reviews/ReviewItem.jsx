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

  // Is current logged in user the author of this review?
  const isOwner = user?.role === 'CUSTOMER' && user?.id === review.customerId;

  const formattedDate = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const handleDelete = async () => {
    try {
      await deleteReview(review.id);
    } catch (err) {
      alert(err.message || 'Failed to delete review');
    }
  };

  return (
    <Card className="p-6 border-border/80 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light font-heading text-sm font-bold text-primary">
            {review.customerName?.slice(0, 2).toUpperCase() || 'CU'}
          </div>
          <div>
            <h4 className="font-heading text-base font-bold text-foreground">
              {review.customerName || 'Verified Client'}
            </h4>
            <div className="flex items-center space-x-2 pt-0.5">
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${s <= review.rating ? 'fill-amber-400' : 'text-border'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{formattedDate}</span>
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
                className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Edit3 className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
              {confirmDelete ? (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="h-8 px-2.5 text-xs font-bold"
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    className="h-8 px-2 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReport(review)}
              title="Report review"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Flag className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-foreground/90 leading-relaxed font-normal">
        {review.comment}
      </p>
    </Card>
  );
}
