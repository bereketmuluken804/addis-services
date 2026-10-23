import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
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
  Layers,
  MapPin,
  Plus,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Power,
  Globe,
  Tag,
} from 'lucide-react';

export function AdminReferenceDataPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'locations'

  // Categories query
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/categories');
      return res.data;
    },
  });

  // Locations query
  const { data: locations = [], isLoading: locLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await api.get('/api/locations');
      return res.data;
    },
  });

  // Modal states
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createCityOpen, setCreateCityOpen] = useState(false);
  const [createSubCityOpen, setCreateSubCityOpen] = useState(false);

  // Form states
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameAm, setCatNameAm] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('wrench');
  const [catOrder, setCatOrder] = useState('1');

  const [cityNameEn, setCityNameEn] = useState('');
  const [cityNameAm, setCityNameAm] = useState('');
  const [citySlug, setCitySlug] = useState('');

  const [subCityNameEn, setSubCityNameEn] = useState('');
  const [subCityNameAm, setSubCityNameAm] = useState('');
  const [subCitySlug, setSubCitySlug] = useState('');
  const [subCityCityId, setSubCityCityId] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/api/admin/categories', {
        nameEn: catNameEn.trim(),
        nameAm: catNameAm.trim(),
        slug: catSlug.trim().toLowerCase(),
        iconName: catIcon.trim(),
        displayOrder: Number(catOrder),
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCreateCategoryOpen(false);
      setCatNameEn('');
      setCatNameAm('');
      setCatSlug('');
    } catch (err) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCity = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/api/admin/cities', {
        nameEn: cityNameEn.trim(),
        nameAm: cityNameAm.trim(),
        slug: citySlug.trim().toLowerCase(),
      });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setCreateCityOpen(false);
      setCityNameEn('');
      setCityNameAm('');
      setCitySlug('');
    } catch (err) {
      setError(err.message || 'Failed to create city');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubCity = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/api/admin/sub-cities', {
        cityId: Number(subCityCityId),
        nameEn: subCityNameEn.trim(),
        nameAm: subCityNameAm.trim(),
        slug: subCitySlug.trim().toLowerCase(),
      });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setCreateSubCityOpen(false);
      setSubCityNameEn('');
      setSubCityNameAm('');
      setSubCitySlug('');
    } catch (err) {
      setError(err.message || 'Failed to create sub-city');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Reference Data
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage service trade categories, cities, and sub-city jurisdictions.
            </p>
          </div>

          <div className="flex gap-2">
            {activeTab === 'categories' ? (
              <Button
                onClick={() => {
                  setError('');
                  setCreateCategoryOpen(true);
                }}
                className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setError('');
                    setCreateCityOpen(true);
                  }}
                  variant="outline"
                  className="rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add City
                </Button>
                <Button
                  onClick={() => {
                    setError('');
                    setSubCityCityId(locations[0]?.id ? String(locations[0].id) : '');
                    setCreateSubCityOpen(true);
                  }}
                  className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Sub-city
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b border-border/60 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'categories'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            Service Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'locations'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            Cities & Sub-cities ({locations[0]?.subCities?.length || 0} sub-cities)
          </button>
        </div>

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {catLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-5 border-border bg-card shadow-subtle rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-12 rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <Card key={cat.id} className="p-5 rounded-2xl border-border/70 bg-card shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary font-bold">
                          #{cat.displayOrder}
                        </div>
                        <div>
                          <h4 className="font-heading text-base font-bold text-foreground">
                            {cat.nameEn}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {cat.nameAm} • slug: <span className="font-mono">{cat.slug}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold border-emerald-300 bg-emerald-50 text-emerald-800">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="space-y-6">
            {locLoading ? (
              <Card className="p-6 border-border bg-card shadow-subtle rounded-lg space-y-4">
                <div className="flex items-center space-x-3 border-b border-border pb-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="p-3 border border-border/60 rounded-md bg-muted/20 space-y-1.5">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              locations.map((city) => (
                <Card key={city.id} className="p-6 rounded-2xl border-border/70 bg-card shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <Globe className="h-5 w-5 text-primary" />
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {city.nameEn} ({city.nameAm})
                      </h3>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {city.slug}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Sub-cities ({city.subCities?.length || 0})
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {city.subCities?.map((sub) => (
                        <div
                          key={sub.id}
                          className="rounded-xl border border-border/70 bg-muted/40 p-3 text-xs space-y-1"
                        >
                          <span className="block font-semibold text-foreground">{sub.nameEn}</span>
                          <span className="block text-[11px] text-muted-foreground">{sub.nameAm}</span>
                          <span className="block text-[10px] font-mono text-muted-foreground/70">
                            {sub.slug}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Modal: Create Category */}
        <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
          <DialogContent className="max-w-md p-6 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Add Service Category</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Create a new active trade category in the platform registry.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  English Name
                </label>
                <Input
                  required
                  placeholder="e.g. Carpentry"
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Amharic Name
                </label>
                <Input
                  required
                  placeholder="e.g. የአናጺ ስራ"
                  value={catNameAm}
                  onChange={(e) => setCatNameAm(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  URL Slug
                </label>
                <Input
                  required
                  placeholder="e.g. carpentry"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Icon Name
                  </label>
                  <Input
                    required
                    placeholder="wrench, zap, hammer"
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Display Order
                  </label>
                  <Input
                    required
                    type="number"
                    value={catOrder}
                    onChange={(e) => setCatOrder(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateCategoryOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="rounded-xl text-xs font-bold">
                  {saving ? <span className="flex items-center gap-1.5"><Spinner size="xs" className="border-white border-t-transparent" /> Creating...</span> : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Create City */}
        <Dialog open={createCityOpen} onOpenChange={setCreateCityOpen}>
          <DialogContent className="max-w-md p-6 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Add City Jurisdiction</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register a new city for service expansion.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCity} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  English City Name
                </label>
                <Input
                  required
                  placeholder="e.g. Hawassa"
                  value={cityNameEn}
                  onChange={(e) => setCityNameEn(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Amharic City Name
                </label>
                <Input
                  required
                  placeholder="e.g. ሀዋሳ"
                  value={cityNameAm}
                  onChange={(e) => setCityNameAm(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  City Slug
                </label>
                <Input
                  required
                  placeholder="e.g. hawassa"
                  value={citySlug}
                  onChange={(e) => setCitySlug(e.target.value)}
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateCityOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="rounded-xl text-xs font-bold">
                  {saving ? <span className="flex items-center gap-1.5"><Spinner size="xs" className="border-white border-t-transparent" /> Creating...</span> : "Create City"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Create Sub-City */}
        <Dialog open={createSubCityOpen} onOpenChange={setCreateSubCityOpen}>
          <DialogContent className="max-w-md p-6 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Add Sub-City</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add a new administrative sub-city under a registered city.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSubCity} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  City
                </label>
                <select
                  required
                  value={subCityCityId}
                  onChange={(e) => setSubCityCityId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select city...</option>
                  {locations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  English Sub-city Name
                </label>
                <Input
                  required
                  placeholder="e.g. Kirkos"
                  value={subCityNameEn}
                  onChange={(e) => setSubCityNameEn(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Amharic Sub-city Name
                </label>
                <Input
                  required
                  placeholder="e.g. ቂርቆስ"
                  value={subCityNameAm}
                  onChange={(e) => setSubCityNameAm(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sub-city Slug
                </label>
                <Input
                  required
                  placeholder="e.g. kirkos"
                  value={subCitySlug}
                  onChange={(e) => setSubCitySlug(e.target.value)}
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateSubCityOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="rounded-xl text-xs font-bold">
                  {saving ? <span className="flex items-center gap-1.5"><Spinner size="xs" className="border-white border-t-transparent" /> Creating...</span> : "Create Sub-city"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
