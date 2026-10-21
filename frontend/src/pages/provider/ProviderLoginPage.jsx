import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Phone, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api-client';

export function ProviderLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Forced password change state if mustChangePassword is true
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login({ phone: phone.trim(), password });
      if (user.role !== 'PROVIDER') {
        setError('This portal is for domestic service providers. Admins should use /admin/login.');
        return;
      }

      if (user.mustChangePassword) {
        setMustChangePassword(true);
      } else {
        navigate('/provider/dashboard');
      }
    } catch (err) {
      if (err.code === 'INVALID_CREDENTIALS') {
        setError('Incorrect phone number or password. Please verify and try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setChangePasswordLoading(true);

    try {
      await api.patch('/api/provider/me/password', {
        currentPassword: password,
        newPassword,
      });
      navigate('/provider/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-20 max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow-primary mb-4">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {mustChangePassword ? 'Create New Password' : 'Provider Sign In'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mustChangePassword
            ? 'Your password was reset by an admin. Please set your new secure password.'
            : 'Access your profile, availability, and customer call metrics.'}
        </p>
      </div>

      <Card className="p-8 sm:p-9 border-border/80 shadow-subtle">
        {error && (
          <div className="mb-6 flex items-start space-x-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {mustChangePassword ? (
          <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                New Secure Password
              </label>
              <Input
                required
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Confirm New Password
              </label>
              <Input
                required
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={changePasswordLoading}
              className="w-full h-12 rounded-xl font-bold mt-2 shadow-sm"
            >
              {changePasswordLoading ? 'Updating Password...' : 'Save Password & Enter Dashboard'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Registered Phone Number
              </label>
              <Input
                required
                placeholder="0911223344 or +251911223344"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <Input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold mt-2 shadow-sm"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </Button>
          </form>
        )}

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Don't have a provider account yet?{' '}
          <Link to="/provider/register" className="font-bold text-primary hover:underline">
            Register as a Pro
          </Link>
        </div>
      </Card>
    </div>
  );
}
