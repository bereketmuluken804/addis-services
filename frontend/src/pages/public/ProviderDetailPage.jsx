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
  Clock,
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
      <div className="container mx-auto px-4 py-16 max-w-4xl space-y-8">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center space-x-6">
          <Skeleton className="h-28 w-28 rounded-3xl" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="font-heading text-2xl font-bold">Provider Not Found</h2>
        <p className="mt-2 text-muted-foreground">The provider you are looking for is inactive or does not exist.</p>
        <Link to="/providers" className="mt-6 inline-block">
          <Button variant="default">Back to Directory</Button>
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
    <div className="container mx-auto px-4 py-12 max-w-4xl pb-32">
      {/* Back Link */}
      <Link
        to="/providers"
        className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to verified providers
      </Link>

      {/* Main Profile Header Card */}
      <Card className="p-8 sm:p-10 border-border/80 bg-card mb-10 shadow-subtle">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            {provider.avatarUrl ? (
              <img
                src={provider.avatarUrl}
                alt={provider.fullName}
                className="h-28 w-28 rounded-3xl object-cover border-2 border-border shadow-md"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-primary-light font-heading text-3xl font-extrabold text-primary shadow-sm">
                {initials}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  {provider.fullName}
                </h1>
                <span title="Verified by National ID & Admin Review">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="px-3 py-1 font-bold text-primary">
                  {provider.category?.nameEn || provider.categoryName}
                </Badge>
                {provider.experienceYears ? (
                  <span className="flex items-center font-medium">
                    <Briefcase className="mr-1.5 h-4 w-4 text-primary" />
                    {provider.experienceYears} Years Experience
                  </span>
                ) : null}
              </div>

              <div className="mt-2.5 flex items-center justify-center sm:justify-start space-x-2 text-xs font-semibold text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {provider.subCity?.nameEn || provider.subCityName || 'Addis Ababa'}
                  {provider.woreda ? `, Woreda ${provider.woreda}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Availability & Call CTA */}
          <div className="flex flex-col items-center sm:items-end space-y-4">
            {provider.isAvailable ? (
              <Badge variant="success" className="px-3.5 py-1.5 text-xs font-bold gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Available for Work
              </Badge>
            ) : (
              <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
                Currently Busy / Offline
              </Badge>
            )}

            <Button
              size="lg"
              onClick={() => openCallModal(provider)}
              className="w-full sm:w-auto h-13 rounded-2xl px-8 text-base font-bold shadow-md hover:shadow-lg"
            >
              <Phone className="mr-2 h-5 w-5" />
              Call {provider.fullName?.split(' ')[0]}
            </Button>
          </div>
        </div>
      </Card>

      {/* About & Bio Section */}
      <section className="mb-10">
        <Card className="p-8 border-border/80">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-2xl font-bold">About the Professional</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line font-normal">
              {provider.bio ||
                'This professional has verified their credentials with Addis Services and provides prompt, high-quality domestic services across Addis Ababa.'}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Portfolio / Work Samples Gallery */}
      {provider.workSamples && provider.workSamples.length > 0 && (
        <section className="mb-10">
          <Card className="p-8 border-border/80">
            <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ImageIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl font-bold">Work Samples & Portfolio</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {provider.workSamples.map((imgUrl, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-2xl border border-border">
                    <img
                      src={imgUrl}
                      alt={`Work sample ${idx + 1}`}
                      className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Customer Reviews & Ratings Section */}
      <section className="space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Customer Reviews
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Feedback from verified Addis Ababa residents who contacted this pro.
            </p>
          </div>
          <Button
            onClick={handleWriteReviewClick}
            variant="outline"
            className="rounded-xl font-bold border-primary/40 text-primary hover:bg-primary-light"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Write a Review
          </Button>
        </div>

        {/* Rating Breakdown Banner */}
        <Card className="p-8 border-border/80 bg-background/50 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <span className="font-heading text-5xl font-extrabold text-foreground">
              {rating > 0 ? rating : '—'}
            </span>
            <div>
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${s <= Math.round(Number(rating)) ? 'fill-amber-400' : 'text-border'}`}
                  />
                ))}
              </div>
              <span className="mt-1 block text-sm font-semibold text-muted-foreground">
                Based on {provider.reviewCount || 0} reviews
              </span>
            </div>
          </div>
          <div className="text-center sm:text-right text-xs text-muted-foreground">
            <p>100% Verified Customer Reviews</p>
            <p className="mt-0.5">One review per customer enforced by platform</p>
          </div>
        </Card>

        {/* Reviews List */}
        {isReviewsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-border/90">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h4 className="font-heading text-lg font-bold">No Reviews Yet</h4>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Be the first to share your experience with {provider.fullName}.
            </p>
            <Button onClick={handleWriteReviewClick} className="mt-6 rounded-xl font-bold">
              Write First Review
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
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
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewsPage <= 1}
                  onClick={() => setReviewsPage(reviewsPage - 1)}
                  className="rounded-xl font-semibold"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Prev
                </Button>
                <span className="text-xs font-semibold text-muted-foreground">
                  Page {reviewsPage} of {reviewsPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewsPage >= reviewsPagination.totalPages}
                  onClick={() => setReviewsPage(reviewsPage + 1)}
                  className="rounded-xl font-semibold"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Fixed Sticky Mobile Bottom Call Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 p-4 backdrop-blur-md sm:hidden shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="font-heading text-sm font-bold text-foreground truncate max-w-[180px]">
              {provider.fullName}
            </h4>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{rating > 0 ? rating : 'New'}</span>
              <span>•</span>
              <span>{provider.isAvailable ? 'Available' : 'Offline'}</span>
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => openCallModal(provider)}
            className="flex-1 h-12 rounded-xl text-sm font-bold shadow-md"
          >
            <Phone className="mr-2 h-4 w-4" />
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
