import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Phone,
  Lock,
  Briefcase,
  MapPin,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { api } from '@/lib/api-client';

export function ProviderRegisterPage() {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCityId, setSubCityId] = useState('');
  const [woreda, setWoreda] = useState('');
  const [experienceYears, setExperienceYears] = useState('3');
  const [bio, setBio] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [idFilePreview, setIdFilePreview] = useState(null);

  const subCities = locations[0]?.subCities || [];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('ID document file must be smaller than 10 MB.');
      return;
    }

    setError(null);
    setIdFile(file);
    setIdFilePreview(URL.createObjectURL(file));
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!fullName.trim() || !phone.trim() || !password.trim()) {
        setError('Please complete all credential fields.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!categoryId || !subCityId) {
        setError('Please select both a service category and your sub-city.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!idFile) {
      setError('Please upload your National ID or Passport document.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('phone', phone.trim());
      formData.append('password', password);
      formData.append('categoryId', categoryId);
      formData.append('cityId', locations[0]?.id ? String(locations[0].id) : '1'); // Addis Ababa
      formData.append('subCityId', subCityId);
      if (woreda.trim()) formData.append('woreda', woreda.trim());
      if (experienceYears) formData.append('experienceYears', experienceYears);
      if (bio.trim()) formData.append('bio', bio.trim());
      formData.append('idDocument', idFile);

      await api.post('/api/auth/provider/register', formData);
      setSuccess(true);
    } catch (err) {
      if (err.code === 'DUPLICATE_PHONE') {
        setError('This phone number is already registered. Please sign in or use another number.');
        setStep(1);
      } else if (err.code === 'INVALID_PHONE') {
        setError('Please enter a valid Ethiopian mobile phone number (e.g. 0911223344 or +251911223344).');
        setStep(1);
      } else {
        setError(err.message || 'Registration failed. Please check your information.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-lg text-center">
        <Card className="p-10 border-border/80 shadow-card">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Application Received!
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Thank you, <strong>{fullName}</strong>. Your provider application and identity document have been submitted to the Addis Services admin team for review.
          </p>
          <div className="mt-6 rounded-2xl bg-muted/60 p-4 text-xs text-muted-foreground text-left space-y-2">
            <p className="font-semibold text-foreground">What happens next?</p>
            <p>1. Our team reviews your ID credentials within 24 hours.</p>
            <p>2. Once verified, your status will become <strong>APPROVED</strong> and your profile goes live.</p>
          </div>
          <Link to="/provider/login" className="mt-8 block">
            <Button size="lg" className="w-full h-12 rounded-xl font-bold">
              Sign In to Your Pro Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl">
      <div className="mb-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow-primary mb-4">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Join Addis Services as a Pro
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Step {step} of 3: {step === 1 ? 'Credentials' : step === 2 ? 'Your Trade & Area' : 'ID Document Verification'}
        </p>

        {/* Progress Bar */}
        <div className="mx-auto mt-6 flex max-w-xs items-center gap-2">
          <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        </div>
      </div>

      <Card className="p-8 sm:p-10 border-border/80 shadow-subtle">
        {error && (
          <div className="mb-6 flex items-start space-x-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          {/* Step 1: Credentials */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </label>
                <Input
                  required
                  placeholder="e.g. Abebe Tola"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Phone Number (Ethiopia)
                </label>
                <Input
                  required
                  placeholder="0911223344 or +251911223344"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Customers will call this number directly for job bookings.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Create Password
                </label>
                <Input
                  required
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full h-12 rounded-xl font-bold justify-between">
                  <span>Continue to Trade Details</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Trade & Area */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Primary Trade / Category
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-input bg-card px-3.5 text-sm font-medium outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select your service category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Sub-city (Addis Ababa)
                  </label>
                  <select
                    required
                    value={subCityId}
                    onChange={(e) => setSubCityId(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-input bg-card px-3.5 text-sm font-medium outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary"
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
                    Woreda (Optional)
                  </label>
                  <Input
                    placeholder="e.g. 03"
                    value={woreda}
                    onChange={(e) => setWoreda(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

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
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Short Professional Bio
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your skills, tools, and specialties (e.g. expert pipe fittings, emergency leak repair)..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card p-3.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-12 rounded-xl font-semibold px-5"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1 h-12 rounded-xl font-bold justify-between">
                  <span>Continue to ID Verification</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: National ID Verification */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-primary-light/50 border border-primary/20 p-4 text-xs text-foreground/80 space-y-1.5">
                <p className="font-bold text-primary flex items-center">
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  Private & Confidential Verification
                </p>
                <p>
                  To protect households in Addis Ababa, all providers must upload a clear photo of their Kebele ID, Resident ID, or Passport. This file is stored in a private encrypted vault and never shown publicly.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Upload Government ID Photo
                </label>

                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/90 p-8 text-center transition-colors hover:border-primary/50 bg-card">
                  {idFilePreview ? (
                    <div className="space-y-3">
                      <img
                        src={idFilePreview}
                        alt="ID preview"
                        className="mx-auto h-36 w-auto rounded-xl object-cover shadow-sm border border-border"
                      />
                      <p className="text-xs font-semibold text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        {idFile.name} ({(idFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                      <label className="inline-block cursor-pointer text-xs font-bold text-primary underline">
                        Change photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-3 flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-primary hover:underline">
                          Click to select ID photo
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPEG or PNG (Max 10 MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="h-12 rounded-xl font-semibold px-5"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !idFile}
                  className="flex-1 h-12 rounded-xl font-bold shadow-md hover:shadow-lg"
                >
                  {loading ? 'Submitting Application...' : 'Complete & Submit Application'}
                </Button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Already have a provider account?{' '}
          <Link to="/provider/login" className="font-bold text-primary hover:underline">
            Sign In here
          </Link>
        </div>
      </Card>
    </div>
  );
}
