import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Save, Plus, Trash2 } from 'lucide-react';
import { useProviderMe, useUpdateProviderProfile } from '@/hooks/useProviderPortal';
import { useLocations } from '@/hooks/useLocations';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProviderProfilePage() {
  const { user, isAuthenticated } = useAuthStore();
  const { data: provider, isLoading } = useProviderMe();
  const { data: locations = [] } = useLocations();
  const { mutateAsync: updateProfile, isPending: isSaving } = useUpdateProviderProfile();

  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [subCityId, setSubCityId] = useState('');
  const [woreda, setWoreda] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [workSamples, setWorkSamples] = useState([]);
  const [sampleInput, setSampleInput] = useState('');

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (provider) {
      setBio(provider.bio || '');
      setExperienceYears(provider.experienceYears ? String(provider.experienceYears) : '');
      setSubCityId(provider.subCityId ? String(provider.subCityId) : '');
      setWoreda(provider.woreda || '');
      setAvatarUrl(provider.avatarUrl || '');
      setWorkSamples(provider.workSamples || []);
    }
  }, [provider]);

  if (!isAuthenticated || user?.role !== 'PROVIDER') {
    return <Navigate to="/provider/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const subCities = locations[0]?.subCities || [];

  const handleAddSample = () => {
    if (sampleInput.trim()) {
      setWorkSamples([...workSamples, sampleInput.trim()]);
      setSampleInput('');
    }
  };

  const handleRemoveSample = (index) => {
    setWorkSamples(workSamples.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    try {
      await updateProfile({
        bio: bio.trim(),
        experienceYears: experienceYears ? Number(experienceYears) : null,
        subCityId: subCityId ? Number(subCityId) : null,
        woreda: woreda.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        workSamples,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Link
        to="/provider/dashboard"
        className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          Edit Professional Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your public profile, portfolio photos, and service locations in Addis Ababa.
        </p>
      </div>

      <Card className="p-8 sm:p-10 border-border/80 shadow-subtle">
        {saved && (
          <div className="mb-6 flex items-center space-x-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Profile changes saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start space-x-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Professional Biography
            </label>
            <textarea
              rows={4}
              placeholder="Describe your background, services offered, equipment, and customer guarantees..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-input bg-card p-3.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          {/* Experience Years */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Years of Experience
            </label>
            <Input
              type="number"
              min="0"
              max="50"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sub-city
              </label>
              <select
                value={subCityId}
                onChange={(e) => setSubCityId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm font-medium outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Select sub-city...</option>
                {subCities.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Woreda
              </label>
              <Input
                placeholder="e.g. 03"
                value={woreda}
                onChange={(e) => setWoreda(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Profile Avatar Image URL
            </label>
            <Input
              type="url"
              placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="h-11 rounded-xl text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Hosted image URL (Unsplash or Cloudinary supported per allowlist).
            </p>
          </div>

          {/* Work Sample Photos URLs */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Portfolio Work Samples (Photo URLs)
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                className="h-11 rounded-xl text-xs flex-1"
              />
              <Button type="button" onClick={handleAddSample} variant="outline" className="h-11 rounded-xl px-4">
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>

            {workSamples.length > 0 && (
              <div className="mt-3 space-y-2">
                {workSamples.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-muted/60 p-2.5 text-xs border border-border">
                    <span className="truncate max-w-[400px] text-foreground font-mono">{url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSample(idx)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={isSaving} className="w-full h-12 rounded-xl font-bold mt-4 shadow-sm">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
