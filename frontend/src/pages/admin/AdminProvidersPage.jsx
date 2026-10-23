import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminProviders, useUpdateActivation, useResetProviderPassword } from '@/hooks/useAdminPortal';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { api } from '@/lib/api-client';
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
  Users,
  Search,
  KeyRound,
  Power,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Copy,
  Check,
  Phone,
  MapPin,
  ExternalLink,
  Filter,
} from 'lucide-react';

export function AdminProvidersPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedIsActive, setSelectedIsActive] = useState('ALL');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [searchId, setSearchId] = useState('');
  const [searchedProvider, setSearchedProvider] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Queries
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();

  const { data: directoryData, isLoading: dirLoading, refetch } = useAdminProviders({
    categoryId: selectedCategory ? Number(selectedCategory) : undefined,
    status: selectedStatus,
    isActive: selectedIsActive,
    search: activeSearch || undefined,
    page,
    limit: 10,
  });

  // Mutations
  const activationMutation = useUpdateActivation();
  const resetPasswordMutation = useResetProviderPassword();

  // Modals state
  const [actionProvider, setActionProvider] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [actionError, setActionError] = useState('');

  // Password reset success modal
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [hasCopied, setHasCopied] = useState(false);

  // State to track activation modal type ('activate' | 'suspend')
  const [activationType, setActivationType] = useState(null);

  const providers = directoryData?.data || [];
  const pagination = directoryData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleSearchByNameOrPhone = (e) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setSearchedProvider(null);
    setPage(1);
  };

  const handleSearchById = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    setSearchedProvider(null);

    try {
      const res = await api.get(`/api/admin/providers/${searchId.trim()}`);
      if (res.data) {
        setSearchedProvider(res.data);
      } else {
        setSearchError('Provider not found.');
      }
    } catch (err) {
      setSearchError(err.message || 'Provider not found.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleOpenActivation = (provider, type) => {
    setActionProvider(provider);
    setActivationType(type);
    setSuspensionReason('');
    setActionError('');
  };

  const handleConfirmActivation = async () => {
    if (activationType === 'suspend' && !suspensionReason.trim()) {
      setActionError('A suspension reason is required for administrative audit.');
      return;
    }

    try {
      await activationMutation.mutateAsync({
        providerId: actionProvider.id,
        isActive: activationType === 'activate',
        reason: suspensionReason.trim() || undefined,
      });

      if (searchedProvider && searchedProvider.id === actionProvider.id) {
        setSearchedProvider({
          ...searchedProvider,
          isActive: activationType === 'activate',
          suspensionReason: activationType === 'suspend' ? suspensionReason.trim() : null,
        });
      }

      setActionProvider(null);
      setActivationType(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to update activation status.');
    }
  };

  const handleOpenResetPassword = (provider) => {
    setActionProvider(provider);
    setResetReason('');
    setActionError('');
  };

  const handleConfirmResetPassword = async () => {
    try {
      const res = await resetPasswordMutation.mutateAsync({
        providerId: actionProvider.id,
        reason: resetReason.trim() || 'Admin-assisted password reset requested by provider',
      });

      setGeneratedPassword(res.temporaryPassword);
      setActionProvider(null);
    } catch (err) {
      setActionError(err.message || 'Failed to generate temporary password.');
    }
  };

  const handleCopyPassword = (text) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const displayList = searchedProvider ? [searchedProvider] : providers;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Provider Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activate or suspend provider accounts, review profiles across all statuses, and issue temporary credentials.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search by Name or Phone */}
            <form onSubmit={handleSearchByNameOrPhone} className="md:col-span-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by Pro Name or Phone (+251...)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              <Button type="submit" className="rounded-xl text-xs font-semibold px-4">
                Search
              </Button>
              {activeSearch && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveSearch('');
                    setSearchInput('');
                    setPage(1);
                  }}
                  className="rounded-xl text-xs"
                >
                  Clear
                </Button>
              )}
            </form>

            {/* Quick Lookup by ID */}
            <form onSubmit={handleSearchById} className="md:col-span-2 flex gap-2">
              <Input
                type="number"
                placeholder="Lookup by Exact ID (e.g. 1)..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="rounded-xl"
              />
              <Button
                type="submit"
                disabled={searchLoading || !searchId.trim()}
                variant="outline"
                className="rounded-xl text-xs font-semibold px-4"
              >
                {searchLoading ? <span className="flex items-center gap-1.5"><Spinner size="xs" /> Looking up...</span> : 'Find ID'}
              </Button>
              {searchedProvider && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearchedProvider(null);
                    setSearchId('');
                  }}
                  className="rounded-xl text-xs"
                >
                  Exit ID View
                </Button>
              )}
            </form>
          </div>

          {/* Secondary Filters: Verification Status, Activation Status, Category */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pl-1">
              <Filter className="h-3.5 w-3.5" /> Filters:
            </span>

            {/* Verification Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setSearchedProvider(null);
                setPage(1);
              }}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending Review</option>
              <option value="REJECTED">Rejected</option>
              <option value="REVOKED">Revoked</option>
            </select>

            {/* Activation Status Filter */}
            <select
              value={selectedIsActive}
              onChange={(e) => {
                setSelectedIsActive(e.target.value);
                setSearchedProvider(null);
                setPage(1);
              }}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Operating States</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive / Suspended Only</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSearchedProvider(null);
                setPage(1);
              }}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {searchError && (
          <div className="rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {searchError}
          </div>
        )}

        {actionError && (
          <div className="rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {actionError}
          </div>
        )}

        {/* Provider Cards / List */}
        {dirLoading && !searchedProvider ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 border-border bg-card shadow-subtle rounded-lg">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-44" />
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-md" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <Card className="rounded-3xl border-border/60 p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="font-heading text-lg font-bold text-foreground">No Providers Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search criteria, category, or status filters.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayList.map((p) => {
              const isApproved = p.verificationStatus === 'APPROVED';
              const isPending = p.verificationStatus === 'PENDING';
              const isRejected = p.verificationStatus === 'REJECTED';
              const isRevoked = p.verificationStatus === 'REVOKED';

              return (
                <Card
                  key={p.id}
                  className="rounded-2xl border-border/60 p-5 shadow-xs hover:border-primary/40 transition-all bg-card"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Left: Info */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-mono font-bold text-muted-foreground">
                          #{p.id}
                        </span>
                        <h3 className="font-heading text-lg font-bold text-foreground">
                          {p.fullName}
                        </h3>
                        {p.category && (
                          <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary">
                            {p.category.nameEn}
                          </Badge>
                        )}

                        {/* Verification Status Badge */}
                        <Badge
                          variant="outline"
                          className={
                            isApproved
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : isPending
                              ? 'border-amber-300 bg-amber-50 text-amber-800'
                              : isRejected
                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                              : 'border-slate-300 bg-slate-100 text-slate-800'
                          }
                        >
                          {p.verificationStatus}
                        </Badge>

                        {/* Activation Status Badge */}
                        <Badge
                          variant="outline"
                          className={
                            p.isActive
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-rose-300 bg-rose-50 text-rose-800'
                          }
                        >
                          {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>

                        {p.isAvailable ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-slate-400" /> Busy
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                          <Phone className="h-3 w-3 text-primary" />
                          {p.phone}
                        </span>
                        {p.subCity && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            {p.subCity.nameEn}
                            {p.woreda && ` (Woreda ${p.woreda})`}
                          </span>
                        )}
                        <span>{p.experienceYears || 0} yrs experience</span>
                        <span>
                          {Number(p.reviewStats?.averageRating || 0).toFixed(1)} ★ ({p.reviewStats?.reviewCount || 0} reviews)
                        </span>
                      </div>

                      {p.suspensionReason && !p.isActive && (
                        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200/60 rounded-xl px-3 py-1.5 mt-2">
                          <span className="font-semibold">Suspension Reason:</span> {p.suspensionReason}
                        </div>
                      )}
                    </div>

                    {/* Right: Administrative Actions */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {isApproved && p.isActive && (
                        <a
                          href={`/providers/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex"
                        >
                          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Public Profile
                          </Button>
                        </a>
                      )}

                      {/* Reset Password Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenResetPassword(p)}
                        className="rounded-xl text-xs font-semibold gap-1.5 border-border/80 text-foreground hover:bg-slate-50"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                        Reset Password
                      </Button>

                      {/* Activation / Suspension Toggle */}
                      {p.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenActivation(p, 'suspend')}
                          className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold gap-1.5"
                        >
                          <Power className="h-3.5 w-3.5" />
                          Suspend Listing
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!isApproved}
                          title={!isApproved ? 'Provider must be APPROVED before activation' : undefined}
                          onClick={() => handleOpenActivation(p, 'activate')}
                          className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs font-semibold gap-1.5 disabled:opacity-50"
                        >
                          <Power className="h-3.5 w-3.5" />
                          Activate Listing
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Pagination Controls */}
            {!searchedProvider && pagination.totalPages > 1 && (
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

        {/* Activation / Suspension Confirmation Modal */}
        <Dialog open={Boolean(activationType)} onOpenChange={(open) => !open && setActivationType(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold">
                {activationType === 'suspend' ? 'Suspend Provider Listing' : 'Reactivate Provider Listing'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {activationType === 'suspend'
                  ? `Suspending ${actionProvider?.fullName} will immediately hide them from all public search results and call leads.`
                  : `Reactivating ${actionProvider?.fullName} will immediately make their verified profile visible to domestic customers across Addis Ababa.`}
              </DialogDescription>
            </DialogHeader>

            {activationType === 'suspend' && (
              <div className="space-y-2 py-3">
                <label className="text-xs font-semibold text-foreground">
                  Suspension Reason (Required for Audit Logs)
                </label>
                <Input
                  placeholder="e.g. Unreachable on verified phone, customer dispute pending..."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            )}

            {actionError && (
              <div className="rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {actionError}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                variant="outline"
                onClick={() => setActivationType(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant={activationType === 'suspend' ? 'destructive' : 'default'}
                disabled={activationMutation.isPending}
                onClick={handleConfirmActivation}
                className="rounded-xl text-xs font-semibold"
              >
                {activationMutation.isPending
                  ? 'Updating...'
                  : activationType === 'suspend'
                  ? 'Confirm Suspension'
                  : 'Confirm Activation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Modal */}
        <Dialog open={Boolean(actionProvider && !activationType)} onOpenChange={(open) => !open && setActionProvider(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <KeyRound className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center font-heading text-lg font-bold">
                Admin Password Reset
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                Generate a temporary password for <strong>{actionProvider?.fullName}</strong> ({actionProvider?.phone}).
                All active sessions will be revoked, and the provider will be required to choose a new password upon login.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-3">
              <label className="text-xs font-semibold text-foreground">
                Administrative Reason (Optional)
              </label>
              <Input
                placeholder="e.g. Identity verified via telephone support call..."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
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
                onClick={() => setActionProvider(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                disabled={resetPasswordMutation.isPending}
                onClick={handleConfirmResetPassword}
                className="rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                {resetPasswordMutation.isPending ? 'Generating...' : 'Issue Temporary Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generated Password Modal */}
        <Dialog open={Boolean(generatedPassword)} onOpenChange={(open) => !open && setGeneratedPassword('')}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center font-heading text-lg font-bold">
                Temporary Password Generated
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                Copy and deliver this password securely to the verified provider over phone support.
                <span className="block mt-1 font-semibold text-amber-700">
                  This password will NOT be shown again.
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 rounded-2xl border border-border bg-slate-50 p-4 text-center">
              <span className="block font-mono text-xl font-bold tracking-wider text-foreground select-all">
                {generatedPassword}
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => handleCopyPassword(generatedPassword)}
              className="w-full rounded-xl text-xs font-semibold gap-2"
            >
              {hasCopied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" /> Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Password
                </>
              )}
            </Button>

            <DialogFooter className="mt-4">
              <Button
                variant="default"
                onClick={() => setGeneratedPassword('')}
                className="w-full rounded-xl text-xs font-semibold"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
