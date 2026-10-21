import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useProviders } from '@/hooks/useProviders';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { useUpdateActivation, useResetProviderPassword } from '@/hooks/useAdminPortal';
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
} from 'lucide-react';

export function AdminProvidersPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [searchId, setSearchId] = useState('');
  const [searchedProvider, setSearchedProvider] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Queries
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const { data: directoryData, isLoading: dirLoading } = useProviders({
    categoryId: selectedCategory ? Number(selectedCategory) : undefined,
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

  const handleSearchById = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    setSearchedProvider(null);

    try {
      const res = await api.get(`/api/providers/${searchId.trim()}`);
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

      // Update local state if currently viewing searched provider
      if (searchedProvider && searchedProvider.id === actionProvider.id) {
        setSearchedProvider({
          ...searchedProvider,
          isActive: activationType === 'activate',
        });
      }

      setActionProvider(null);
      setActivationType(null);
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
      setActionError(err.message || 'Failed to reset provider password.');
    }
  };

  const copyToClipboard = (text) => {
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
            Activate or suspend provider accounts, review profile details, or issue temporary credentials.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form onSubmit={handleSearchById} className="md:col-span-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Search by Provider ID (e.g. 1, 42)..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={searchLoading || !searchId.trim()}
              className="rounded-xl text-xs font-semibold px-5"
            >
              {searchLoading ? 'Looking up...' : 'Lookup'}
            </Button>
            {searchedProvider && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchedProvider(null);
                  setSearchId('');
                }}
                className="rounded-xl text-xs"
              >
                Clear Search
              </Button>
            )}
          </form>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSearchedProvider(null);
                setPage(1);
              }}
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <Card className="rounded-3xl border-border/60 p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="font-heading text-lg font-bold text-foreground">No Providers Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your category filter or search by another Provider ID.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayList.map((p) => (
              <Card
                key={p.id}
                className="rounded-2xl border-border/60 p-5 shadow-sm hover:border-primary/40 transition-all bg-white"
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
                      <Badge
                        variant="outline"
                        className={
                          p.isActive !== false
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-rose-300 bg-rose-50 text-rose-800'
                        }
                      >
                        {p.isActive !== false ? 'ACTIVE' : 'SUSPENDED'}
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
                      <span>{p.experienceYears} yrs experience</span>
                      <span>{p.stats?.rating?.toFixed(1) || '0.0'} ★ ({p.stats?.reviewsCount || 0} reviews)</span>
                    </div>
                  </div>

                  {/* Right: Administrative Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
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
                    {p.isActive !== false ? (
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
                        onClick={() => handleOpenActivation(p, 'activate')}
                        className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs font-semibold gap-1.5"
                      >
                        <Power className="h-3.5 w-3.5" />
                        Reactivate Listing
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}

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
                Provider: <span className="font-semibold text-foreground">{actionProvider?.fullName}</span> (#{actionProvider?.id})
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-3">
              {activationType === 'suspend' ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Suspending hides this provider from all public search results and disables customer calls immediately.
                  </p>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Suspension Reason (Required for Audit)
                  </label>
                  <Input
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    placeholder="e.g. Repeated customer complaints, unreachable phone"
                    className="rounded-xl"
                    autoFocus
                  />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Reactivating restores this provider to the public directory if their identity verification is approved.
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setActivationType(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant={activationType === 'suspend' ? 'destructive' : 'default'}
                disabled={activationMutation.isPending || (activationType === 'suspend' && !suspensionReason.trim())}
                onClick={handleConfirmActivation}
                className="rounded-xl text-xs font-semibold"
              >
                {activationType === 'suspend' ? 'Confirm Suspension' : 'Confirm Reactivation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Reset Modal */}
        <Dialog open={Boolean(actionProvider && !activationType)} onOpenChange={(open) => !open && setActionProvider(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-600">
                <KeyRound className="h-5 w-5" />
                <DialogTitle className="font-heading text-lg font-bold">
                  Issue Temporary Password
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Reset credentials for <span className="font-semibold text-foreground">{actionProvider?.fullName}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-800">
                <span className="font-semibold">Security Behavior (spec §4.4):</span> A 12+ character temporary password will be generated. All existing refresh tokens will be revoked, and the provider will be forced to choose a new password upon login.
              </div>

              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reason / Ticket Reference (Optional)
              </label>
              <Input
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="e.g. Provider forgot credentials or requested via phone"
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2">
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
                {resetPasswordMutation.isPending ? 'Generating...' : 'Generate Temporary Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Temporary Password Revealed Modal (Shown ONCE) */}
        <Dialog open={Boolean(generatedPassword)} onOpenChange={(open) => !open && setGeneratedPassword('')}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
                <DialogTitle className="font-heading text-lg font-bold">
                  Temporary Password Generated
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Copy and deliver this password to the provider. It is shown only once and will never be logged.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 p-4">
                <span className="font-mono text-base font-bold tracking-wider text-emerald-950">
                  {generatedPassword}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedPassword)}
                  className="rounded-xl border-emerald-300 bg-white hover:bg-emerald-100 text-xs font-semibold gap-1.5"
                >
                  {hasCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                The provider must enter this password at <span className="font-mono text-foreground font-medium">/provider/login</span> and will immediately be prompted to create their permanent private password before accessing features.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="default"
                onClick={() => setGeneratedPassword('')}
                className="w-full rounded-xl text-xs font-semibold"
              >
                I have securely saved / sent this password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
