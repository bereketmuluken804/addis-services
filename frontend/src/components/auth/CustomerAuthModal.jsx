import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { ShieldCheck, User, Phone, Lock, AlertCircle } from 'lucide-react';

export function CustomerAuthModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login, setAuth } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        await login({ phone, password });
        onSuccess?.();
        onClose();
      } else {
        const res = await api.post('/api/auth/register/customer', {
          fullName,
          phone,
          password,
        });
        const { accessToken, user } = res.data;
        setAuth(user, accessToken);
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      if (err.code === 'INVALID_CREDENTIALS') {
        setError('Invalid phone number or password. Please try again.');
      } else if (err.code === 'DUPLICATE_PHONE') {
        setError('This phone number is already registered. Please sign in instead.');
      } else if (err.code === 'INVALID_PHONE') {
        setError('Please enter a valid Ethiopian mobile number (e.g. 0911223344 or +251911223344).');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-8">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary shadow-xs">
            <User className="h-7 w-7" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            {tab === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {tab === 'login'
              ? 'Sign in to share your experience with Addis Ababa service providers.'
              : 'Join as a customer to rate and review domestic technicians.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="mt-4 flex rounded-xl bg-muted p-1 border border-border/80">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === 'login'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === 'register'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start space-x-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {tab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <Input
                required
                placeholder="e.g. Abebe Tola"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Phone Number
            </label>
            <Input
              required
              placeholder="0911223344 or +251911223344"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 rounded-xl"
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
              className="h-11 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-bold mt-2 shadow-sm"
          >
            {loading
              ? 'Please wait...'
              : tab === 'login'
              ? 'Sign In & Continue'
              : 'Create Account & Continue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
