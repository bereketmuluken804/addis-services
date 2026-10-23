import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Lock, Phone, ShieldAlert, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import {
  useChangePassword,
  useCurrentPhoneChangeRequest,
  useCreatePhoneChangeRequest,
  useCancelPhoneChangeRequest,
} from '@/hooks/useProviderPortal';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatPhoneNumber } from '@/lib/utils';

export function ProviderSecurityPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  // Phone Change state
  const [newPhone, setNewPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [phoneReason, setPhoneReason] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState(null);

  const { mutateAsync: changePassword, isPending: isChangingPassword } = useChangePassword();
  const { data: currentRequest, isLoading: isRequestLoading } = useCurrentPhoneChangeRequest();
  const { mutateAsync: createPhoneRequest, isPending: isCreatingRequest } = useCreatePhoneChangeRequest();
  const { mutateAsync: cancelPhoneRequest, isPending: isCancellingRequest } = useCancelPhoneChangeRequest();

  if (isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'PROVIDER') {
    return <Navigate to="/provider/login" replace />;
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    }
  };

  const handlePhoneRequestSubmit = async (e) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSuccess(false);

    try {
      await createPhoneRequest({
        newPhone: newPhone.trim(),
        currentPassword: phonePassword,
        reason: phoneReason.trim(),
      });
      setPhoneSuccess(true);
      setNewPhone('');
      setPhonePassword('');
      setPhoneReason('');
      setTimeout(() => setPhoneSuccess(false), 3000);
    } catch (err) {
      if (err.code === 'DUPLICATE_PHONE') {
        setPhoneError('This phone number is already registered by another provider.');
      } else if (err.code === 'PENDING_REQUEST_EXISTS') {
        setPhoneError('You already have an active pending phone change request.');
      } else if (err.code === 'INVALID_CREDENTIALS') {
        setPhoneError('Incorrect current password.');
      } else {
        setPhoneError(err.message || 'Failed to submit phone change request.');
      }
    }
  };

  const handleCancelRequest = async () => {
    try {
      await cancelPhoneRequest();
    } catch (err) {
      alert(err.message || 'Failed to cancel request.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl space-y-8">
      <Link
        to="/provider/dashboard"
        className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Security & Account Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Manage your password and submit admin-mediated phone number changes.
        </p>
      </div>

      {/* Change Password Card */}
      <Card className="p-6 sm:p-8 border-border shadow-subtle">
        <CardHeader className="p-0 mb-5">
          <div className="flex items-center space-x-2.5">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold">Change Password</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Ensure your account is using a strong password of at least 8 characters.
          </CardDescription>
        </CardHeader>

        {passwordSuccess && (
          <div className="mb-5 flex items-center space-x-2.5 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Password updated successfully!</span>
          </div>
        )}

        {passwordError && (
          <div className="mb-5 flex items-start space-x-2.5 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">
              Current Password
            </label>
            <Input
              required
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">
              New Password
            </label>
            <Input
              required
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">
              Confirm New Password
            </label>
            <Input
              required
              type="password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <Button type="submit" disabled={isChangingPassword} className="w-full h-10 font-semibold text-xs mt-2 shadow-subtle">
            {isChangingPassword ? (
              <span className="flex items-center justify-center">
                <Spinner size="xs" className="mr-1.5 border-white border-t-transparent text-white" />
                Saving Password...
              </span>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </Card>

      {/* Admin-Mediated Phone Change Card */}
      <Card className="p-6 sm:p-8 border-border shadow-subtle">
        <CardHeader className="p-0 mb-5">
          <div className="flex items-center space-x-2.5">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold">Request Phone Number Change</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            To prevent fraud and maintain verified records, phone changes are reviewed and approved by administrators.
          </CardDescription>
        </CardHeader>

        {/* Existing Request Status */}
        {currentRequest && currentRequest.status === 'PENDING' ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-900 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center font-bold text-xs sm:text-sm">
                <Clock className="mr-1.5 h-4 w-4 text-amber-600" /> Pending Admin Review
              </span>
              <Badge variant="amber">PENDING</Badge>
            </div>
            <p className="text-xs leading-relaxed text-amber-800">
              You submitted a request to change your number to{' '}
              <strong>{formatPhoneNumber(currentRequest.newPhone)}</strong>.
              {currentRequest.reason && ` Reason: "${currentRequest.reason}".`}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={isCancellingRequest}
              onClick={handleCancelRequest}
              className="rounded-md border-amber-300 bg-white hover:bg-amber-100 font-semibold text-xs h-8"
            >
              {isCancellingRequest ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </div>
        ) : (
          <>
            {currentRequest?.status === 'REJECTED' && (
              <div className="mb-5 rounded-md border border-destructive/20 bg-destructive/5 p-3.5 text-destructive text-xs space-y-1">
                <span className="font-bold flex items-center">
                  <XCircle className="mr-1.5 h-4 w-4" /> Previous Request Rejected:
                </span>
                <p>{currentRequest.rejectionReason || 'Verification could not be established.'}</p>
              </div>
            )}

            {phoneSuccess && (
              <div className="mb-5 flex items-center space-x-2.5 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Phone change request submitted! Our admin team will review it.</span>
              </div>
            )}

            {phoneError && (
              <div className="mb-5 flex items-start space-x-2.5 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{phoneError}</span>
              </div>
            )}

            <form onSubmit={handlePhoneRequestSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">
                  New Phone Number (Ethiopia)
                </label>
                <Input
                  required
                  placeholder="0922334455 or +251922334455"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">
                  Confirm Current Password
                </label>
                <Input
                  required
                  type="password"
                  placeholder="Your current password"
                  value={phonePassword}
                  onChange={(e) => setPhonePassword(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">
                  Reason for Change (Optional)
                </label>
                <Input
                  placeholder="e.g. Lost SIM card, changed mobile provider..."
                  value={phoneReason}
                  onChange={(e) => setPhoneReason(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <Button type="submit" disabled={isCreatingRequest} className="w-full h-10 font-semibold text-xs mt-2 shadow-subtle">
                {isCreatingRequest ? (
                  <span className="flex items-center justify-center">
                    <Spinner size="xs" className="mr-1.5 border-white border-t-transparent text-white" />
                    Submitting Request...
                  </span>
                ) : (
                  "Submit Phone Change Request"
                )}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
