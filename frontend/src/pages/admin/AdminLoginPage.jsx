import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, isAuthenticated, user, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const from = location.state?.from || '/admin/dashboard';

  React.useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    try {
      const loggedUser = await login({ email: email.trim(), password });
      const role = loggedUser?.role || loggedUser?.user?.role;
      if (role !== 'ADMIN') {
        await logout();
        setFormError('Access denied. Administrator privileges required.');
        return;
      }
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16 bg-gradient-to-b from-slate-50 to-background">
      <div className="w-full max-w-md">
        <Card className="border-border/60 shadow-lg p-2 sm:p-4 rounded-3xl">
          <CardHeader className="text-center pb-6">
            <img
              src="/logo.png"
              alt="Addis Services Logo"
              className="mx-auto mb-4 h-20 w-20 object-contain rounded-xl shadow-xs"
            />
            <CardTitle className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Administrator Access
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Sign in to manage provider verifications, moderation, and platform operations.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {(formError || error) && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-destructive/10 p-4 text-xs font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl py-6 font-semibold shadow-md transition-all gap-2 mt-2"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Enter Console</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
