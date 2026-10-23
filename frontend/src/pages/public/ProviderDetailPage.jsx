import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Star,
  MapPin,
  Briefcase,
  Phone,
  Image as ImageIcon,
  MessageSquare,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useProvider } from '@/hooks/useProviders';
import { useProviderReviews } from '@/hooks/useReviews';
import { useCallModalStore } from '@/stores/callModalStore';
import { useAuthStore } from '@/stores/authStore';
import { ReviewItem } from '@/components/reviews/ReviewItem';
import { ReviewFormModal } from '@/components/reviews/ReviewFormModal';
import { ReportReviewModal } from '@/components/reviews/ReportReviewModal';
import { CustomerAuthModal } from '@/components/auth/CustomerAuthModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProviderDetailPage() {
  const { id } = useParams();
  const providerId = Number(id);

  const { data: provider, isLoading: isProviderLoading } = useProvider(providerId);
  const [reviewsPage, setReviewsPage] = useState(1);
  const { data: reviewsResponse, isLoading: isReviewsLoading } = useProviderReviews(providerId, {
    page: reviewsPage,
    limit: 8,
  });

  const { openCallModal } = useCallModalStore();
  const { isAuthenticated, user } = useAuthStore();

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReviewForEdit, setSelectedReviewForEdit] = useState(null);
  const [selectedReviewForReport, setSelectedReviewForReport] = useState(null);

  const handleWriteReviewClick = () => {
    if (!isAuthenticated || user?.role !== 'CUSTOMER') {
      setAuthModalOpen(true);
    } else {
      setSelectedReviewForEdit(null);
      setReviewModalOpen(true);
    }
  };

  const handleEditReview = (review) => {
    setSelectedReviewForEdit(review);
    setReviewModalOpen(true);
  };

  const handleReportReview = (review) => {
    setSelectedReviewForReport(review);
    setReportModalOpen(true);
  };

  if (isProviderLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
        <Skeleton className="h-5 w-28" />
        <div className="flex items-center space-x-4">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="font-heading text-xl font-bold">Technician Not Found</h2>
        <p className="mt-2 text-xs text-muted-foreground">This provider is currently inactive or does not exist.</p>
        <Link to="/providers" className="mt-4 inline-block">
          <Button size="sm" variant="default" className="text-xs">Back to Directory</Button>
        </Link>
      </div>
    );
  }

  const reviews = reviewsResponse?.data || [];
  const reviewsPagination = reviewsResponse?.pagination || { total: reviews.length, totalPages: 1 };
  const rating = Number(provider.averageRating || 0).toFixed(1);
  const initials = provider.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SP';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-24">
      {/* Back Link */}
      <Link
        to="/providers"
        className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Back to Technicians
      </Link>

      {/* Main Profile Header Card */}
      <Card className="p-6 sm:p-8 border-border bg-card mb-8 shadow-card">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
            {provider.avatarUrl ? (
              <img
                src={provider.avatarUrl}
                alt={provider.fullName}
                className="h-20 w-20 rounded-xl object-cover border border-border shrink-0 shadow-subtle"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary-light font-heading text-2xl font-bold text-primary shrink-0 border border-primary/20">
                {initials}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {provider.fullName}
                </h1>
                
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="px-2.5 py-0.5 font-semibold text-primary">
                  {provider.category?.nameEn || provider.categoryName}
                </Badge>
                {provider.experienceYears ? (
                  <span className="flex items-center font-medium">
                    <Briefcase className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                    {provider.experienceYears} Years Experience
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex items-center justify-center sm:justify-start space-x-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {provider.subCity?.nameEn || provider.subCityName || 'Addis Ababa'}
                  {provider.woreda ? `, Woreda ${provider.woreda}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Availability & Call CTA */}
          <div className="flex flex-col items-center sm:items-end space-y-3">
            <div>
              {provider.isAvailable ? (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                  Available for Work
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Currently Busy / Offline
                </span>
              )}
            </div>

            <Button
              size="default"
              onClick={() => openCallModal(provider)}
              className="w-full sm:w-auto h-10 rounded-lg px-6 text-xs font-semibold shadow-subtle"
            >
              <Phone className="mr-1.5 h-4 w-4" />
              Call {provider.fullName?.split(' ')[0]}
            </Button>
          </div>
        </div>
      </Card>

      {/* About & Bio Section */}
      <section className="mb-8">
        <Card className="p-6 border-border">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-lg font-bold">About this Technician</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line font-normal">
              {provider.bio ||
                'This technician is verified on Addis Services with government identification and offers reliable domestic services across Addis Ababa.'}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Portfolio / Work Samples Gallery */}
      {provider.workSamples && provider.workSamples.length > 0 && (
        <section className="mb-8">
          <Card className="p-6 border-border">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg font-bold">Recent Work Samples</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {provider.workSamples.map((imgUrl, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-lg border border-border">
                    <img
                      src={imgUrl}
                      alt={`Work sample ${idx + 1}`}
                      className="h-36 w-full object-cover transition-transform duration-200 group-hover:scale-102"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Customer Reviews & Ratings Section */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Client Feedback
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reviews from verified residents in Addis Ababa who contacted this technician.
            </p>
          </div>
          <Button
            onClick={handleWriteReviewClick}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-semibold border-border hover:bg-muted"
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Write a Review
          </Button>
        </div>

        {/* Rating Breakdown Banner */}
        <Card className="p-5 border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <span className="font-heading text-4xl font-extrabold text-foreground">
              {rating > 0 ? rating : '—'}
            </span>
            <div>
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${s <= Math.round(Number(rating)) ? 'fill-amber-400' : 'text-border'}`}
                  />
                ))}
              </div>
              <span className="mt-1 block text-xs font-medium text-muted-foreground">
                Based on {provider.reviewCount || 0} client {provider.reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>
          <div className="text-center sm:text-right text-xs text-muted-foreground">
            <p className="font-medium text-foreground/80">Verified Feedback</p>
            <p className="mt-0.5">One review per customer enforced</p>
          </div>
        </Card>

        {/* Reviews List */}
        {isReviewsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card className="p-10 text-center border-dashed border-border">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <h4 className="font-heading text-base font-bold">No Reviews Yet</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Have you worked with {provider.fullName}? Share your experience with other residents.
            </p>
            <Button onClick={handleWriteReviewClick} size="sm" className="mt-4 rounded-lg text-xs font-semibold">
              Write First Review
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <ReviewItem
                key={rev.id}
                review={rev}
                providerId={providerId}
                onEdit={handleEditReview}
                onReport={handleReportReview}
              />
            ))}

            {/* Reviews Pagination */}
            {reviewsPagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewsPage <= 1}
                  onClick={() => setReviewsPage(reviewsPage - 1)}
                  className="rounded-lg text-xs font-medium h-8"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Prev
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {reviewsPage} of {reviewsPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewsPage >= reviewsPagination.totalPages}
                  onClick={() => setReviewsPage(reviewsPage + 1)}
                  className="rounded-lg text-xs font-medium h-8"
                >
                  Next
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Fixed Sticky Mobile Bottom Call Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur-md sm:hidden shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate max-w-[160px]">
            <h4 className="font-heading text-xs font-bold text-foreground truncate">
              {provider.fullName}
            </h4>
            <div className="flex items-center space-x-1 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
              <span>{rating > 0 ? rating : 'New'}</span>
              <span>•</span>
              <span>{provider.isAvailable ? 'Available' : 'Offline'}</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => openCallModal(provider)}
            className="flex-1 h-9 rounded-lg text-xs font-semibold shadow-subtle"
          >
            <Phone className="mr-1.5 h-3.5 w-3.5" />
            Call Now
          </Button>
        </div>
      </div>

      {/* Modals */}
      <ReviewFormModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        provider={provider}
        initialReview={selectedReviewForEdit}
      />

      <ReportReviewModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        review={selectedReviewForReport}
        providerId={providerId}
      />

      <CustomerAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setReviewModalOpen(true)}
      />
    </div>
  );
}
