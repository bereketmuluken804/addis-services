import React from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminStats } from '@/hooks/useAdminPortal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  Activity,
  ArrowRight,
  UserCheck,
  UserX,
  FileCheck2,
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Platform Overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time directory health, provider onboarding status, and customer call metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground">Live Telemetry</span>
          </div>
        </div>

        {/* Error notice if any */}
        {error && (
          <div className="rounded-2xl bg-destructive/10 p-4 text-xs font-medium text-destructive">
            Failed to load admin statistics: {error.message}
          </div>
        )}

        {/* Primary Metric KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Providers */}
          <Card className="rounded-2xl border-border/60 shadow-sm p-5 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Providers
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="font-heading text-3xl font-black text-foreground">
                {isLoading ? '...' : providerCounts.total}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">Registered on platform</p>
            </div>
          </Card>

          {/* Card 2: Pending Verifications */}
          <Card className="rounded-2xl border-amber-200/80 bg-amber-50/30 shadow-sm p-5 hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Pending Review
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-heading text-3xl font-black text-amber-900">
                {isLoading ? '...' : providerCounts.pending}
              </span>
              {providerCounts.pending > 0 && (
                <Link to="/admin/verifications">
                  <Badge variant="outline" className="border-amber-300 bg-amber-100/80 text-amber-800 text-[11px] font-semibold hover:bg-amber-200 cursor-pointer">
                    Action needed →
                  </Badge>
                </Link>
              )}
            </div>
            <p className="mt-1 text-xs text-amber-700/80">Awaiting document check</p>
          </Card>

          {/* Card 3: Approved & Active */}
          <Card className="rounded-2xl border-border/60 shadow-sm p-5 hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Listings
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="font-heading text-3xl font-black text-foreground">
                {isLoading ? '...' : providerCounts.active}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                {providerCounts.approved} approved in directory
              </p>
            </div>
          </Card>

          {/* Card 4: Total Call Clicks */}
          <Card className="rounded-2xl border-border/60 shadow-sm p-5 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Call Clicks
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PhoneCall className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="font-heading text-3xl font-black text-foreground">
                {isLoading ? '...' : totalCallClicks}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">Customer call leads generated</p>
            </div>
          </Card>
        </div>

        {/* Detailed Breakdown & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Provider Status Breakdown */}
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Provider Verification Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <UserCheck className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Approved Providers</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{providerCounts.approved}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-amber-50/50 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <FileCheck2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Pending Review</span>
                  </div>
                  <span className="text-sm font-bold text-amber-800">{providerCounts.pending}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                      <UserX className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Rejected or Revoked</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {providerCounts.rejected + providerCounts.revoked}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Suspended / Inactive</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{providerCounts.inactive}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fast Actions */}
          <Card className="rounded-2xl border-border/60 shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader className="pb-4">
                <CardTitle className="font-heading text-base font-bold text-foreground">
                  Operational Queues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  to="/admin/verifications"
                  className="flex items-center justify-between rounded-xl border border-border/60 p-4 transition-all hover:border-primary hover:bg-primary/5 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        Pending ID Documents
                      </span>
                      {providerCounts.pending > 0 && (
                        <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2">
                          {providerCounts.pending}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Inspect Kebele ID / Passport uploads and grant approval
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/admin/phone-requests"
                  className="flex items-center justify-between rounded-xl border border-border/60 p-4 transition-all hover:border-primary hover:bg-primary/5 group"
                >
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      Phone Number Change Requests
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Review provider requests to change business mobile contact
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/admin/providers"
                  className="flex items-center justify-between rounded-xl border border-border/60 p-4 transition-all hover:border-primary hover:bg-primary/5 group"
                >
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      Provider Account Management
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Manage active status, suspend bad actors, or issue temporary password resets
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </Link>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
