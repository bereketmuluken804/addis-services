import React from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminStats } from '@/hooks/useAdminPortal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  Activity,
  ArrowRight,
} from 'lucide-react';

export function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useAdminStats();

  const providerCounts = stats?.providers || {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    revoked: 0,
    active: 0,
    inactive: 0,
  };

  const totalCallClicks = stats?.totalCallClicks ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
              Administration Console
            </h1>
            <p className="text-xs text-muted-foreground">
              Directory verification pipeline, active technician listings, and customer call leads.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Platform Status: <span className="font-semibold text-emerald-700">Healthy</span>
          </div>
        </div>

        {/* Error notice if any */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
            Failed to load admin statistics: {error.message}
          </div>
        )}

        {/* Primary Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Providers */}
          <Card className="rounded-lg border-border p-4 shadow-subtle bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Total Registrations
              </span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <span className="font-heading text-2xl font-bold text-foreground">
                  {providerCounts.total}
                </span>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">Technicians in database</p>
            </div>
          </Card>

          {/* Pending Verifications */}
          <Card className={`rounded-lg border p-4 shadow-subtle ${providerCounts.pending > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-border bg-card'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800">
                Pending Verification
              </span>
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <span className="font-heading text-2xl font-bold text-amber-900">
                  {providerCounts.pending}
                </span>
              )}
              {!isLoading && providerCounts.pending > 0 && (
                <Link to="/admin/verifications">
                  <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-800 text-[10px] font-semibold hover:bg-amber-200">
                    Review →
                  </Badge>
                </Link>
              )}
            </div>
            <p className="text-[11px] text-amber-700/80 mt-0.5">Awaiting ID review</p>
          </Card>

          {/* Active Listings */}
          <Card className="rounded-lg border-border p-4 shadow-subtle bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Active in Directory
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <span className="font-heading text-2xl font-bold text-foreground">
                  {providerCounts.active}
                </span>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {providerCounts.approved} approved by admin
              </p>
            </div>
          </Card>

          {/* Call Clicks */}
          <Card className="rounded-lg border-border p-4 shadow-subtle bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Customer Call Clicks
              </span>
              <PhoneCall className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2">
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <span className="font-heading text-2xl font-bold text-foreground">
                  {totalCallClicks}
                </span>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">Direct phone leads connected</p>
            </div>
          </Card>
        </div>

        {/* Detailed Breakdown & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Status Pipeline */}
          <Card className="rounded-lg border-border shadow-subtle">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Technician Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-medium text-foreground">Approved Providers</span>
                  {isLoading ? <Skeleton className="h-4 w-8" /> : <span className="font-bold text-foreground">{providerCounts.approved}</span>}
                </div>

                <div className="flex items-center justify-between rounded-md bg-amber-50/50 px-3 py-2 text-xs border border-amber-200/50">
                  <span className="font-medium text-amber-800">Pending Review</span>
                  {isLoading ? <Skeleton className="h-4 w-8" /> : <span className="font-bold text-amber-800">{providerCounts.pending}</span>}
                </div>

                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-medium text-foreground">Rejected or Revoked</span>
                  {isLoading ? <Skeleton className="h-4 w-8" /> : (
                    <span className="font-bold text-foreground">
                      {providerCounts.rejected + providerCounts.revoked}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-medium text-foreground">Suspended / Inactive</span>
                  {isLoading ? <Skeleton className="h-4 w-8" /> : <span className="font-bold text-foreground">{providerCounts.inactive}</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operational Queues */}
          <Card className="rounded-lg border-border shadow-subtle flex flex-col justify-between">
            <div>
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Admin Queues
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                <Link
                  to="/admin/verifications"
                  className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/50 group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        Pending ID Documents
                      </span>
                      {providerCounts.pending > 0 && (
                        <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                          {providerCounts.pending}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Inspect Kebele ID or passport uploads to grant listing approval
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                </Link>

                <Link
                  to="/admin/phone-requests"
                  className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/50 group"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Phone Number Change Requests
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Review provider requests to change business mobile contact
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                </Link>

                <Link
                  to="/admin/providers"
                  className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-muted/50 group"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Provider Account Directory
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Toggle active status, suspend accounts, or issue temporary password resets
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                </Link>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
