import React, { useState, useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Save, Plus, Trash2, Upload, Camera } from 'lucide-react';
import { useProviderMe, useUpdateProviderProfile } from '@/hooks/useProviderPortal';
import { useLocations } from '@/hooks/useLocations';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';

export function ProviderProfilePage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data: provider, isLoading, refetch } = useProviderMe();
  const { data: locations = [] } = useLocations();
  const { mutateAsync: updateProfile, isPending: isSaving } = useUpdateProviderProfile();

  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [subCityId, setSubCityId] = useState('');
  const [woreda, setWoreda] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [workSamples, setWorkSamples] = useState([]);
  const [sampleInput, setSampleInput] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (provider) {
      setBio(provider.bio || '');
      setExperienceYears(provider.experienceYears !== undefined && provider.experienceYears !== null ? String(provider.experienceYears) : '');
      setSubCityId(provider.subCityId ? String(provider.subCityId) : '');
      setWoreda(provider.woreda || '');
      setAvatarUrl(provider.avatarUrl || '');
      setWorkSamples(provider.workSamples || []);
    }
  }, [provider]);

  if (isAuthLoading || isLoading) {


  if (!isAuthenticated || user?.role !== 'PROVIDER') {
    return <Navigate to="/provider/login" replace />;
  }
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <Skeleton className="h-4 w-28" />
        <Card className="p-6 border-border bg-card shadow-subtle space-y-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        </Card>
      </div>
    );
  }

  const subCities = locations[0]?.subCities || [];

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarUploadError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarUploadError('Profile image must be 5MB or smaller.');
      return;
    }

    setAvatarUploadError(null);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.post('/api/provider/me/avatar', formData);
      const newAvatarUrl = res?.data?.avatarUrl || res?.data?.data?.avatarUrl || res?.avatarUrl;
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl);
        refetch();
      }
    } catch (err) {
      setAvatarUploadError(err.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
      const payload = {
        bio: bio.trim() || null,
        experienceYears: experienceYears !== '' && !isNaN(Number(experienceYears)) ? Number(experienceYears) : null,
        woreda: woreda.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        workSamples: workSamples || [],
      };
      if (subCityId) payload.subCityId = Number(subCityId);

      await updateProfile(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    }
  };

  const initials = provider?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SP';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        to="/provider/dashboard"
        className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Professional Profile Settings
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Update your public profile photo, biography, and work locations in Addis Ababa.
        </p>
      </div>

      <Card className="p-6 border-border shadow-subtle bg-card">
        {saved && (
          <div className="mb-5 flex items-center space-x-2 border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Profile changes saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start space-x-2 border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile Avatar Upload Section */}
        <div className="mb-6 border-b border-border pb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Profile Photo
          </label>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={provider?.fullName}
                  className="h-20 w-20 object-cover border border-border"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center bg-primary-light font-heading text-xl font-bold text-primary border border-primary/20">
                  {initials}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-3 text-xs font-semibold"
                >
                  {uploadingAvatar ? (
                    <span className="flex items-center gap-1.5">
                      <Spinner size="xs" /> Uploading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5" /> Upload Photo
                    </span>
                  )}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAvatarUrl('')}
                    className="h-9 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Upload a clear headshot or business logo. Supported: JPEG, PNG, or WebP (max 5 MB).
              </p>
              {avatarUploadError && (
                <p className="text-[11px] font-semibold text-destructive">
                  {avatarUploadError}
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">
              Professional Biography
            </label>
            <textarea
              rows={4}
              placeholder="Describe your trade background, types of domestic repairs, response times, and service guarantees..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border border-input bg-card p-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          {/* Experience Years */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">
              Years of Trade Experience
            </label>
            <Input
              type="number"
              min="0"
              max="50"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                Primary Sub-City
              </label>
              <select
                value={subCityId}
                onChange={(e) => setSubCityId(e.target.value)}
                className="flex h-9 w-full border border-input bg-card px-2.5 text-xs font-medium outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary"
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
              <label className="text-xs font-semibold text-foreground/80">
                Woreda
              </label>
              <Input
                placeholder="e.g. 03"
                value={woreda}
                onChange={(e) => setWoreda(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>



          {/* Work Sample Photos URLs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80">
              Portfolio / Work Samples (URLs)
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                className="h-9 text-xs flex-1"
              />
              <Button type="button" onClick={handleAddSample} variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>

            {workSamples.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {workSamples.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted/40 p-2 text-xs border border-border">
                    <span className="truncate max-w-[400px] text-foreground font-mono">{url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSample(idx)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={isSaving} className="w-full h-10 font-semibold text-xs mt-2 shadow-subtle">
            {isSaving ? (
              <span className="flex items-center justify-center">
                <Spinner size="xs" className="mr-1.5 border-white border-t-transparent text-white" />
                Saving Changes...
              </span>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Profile Changes
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
