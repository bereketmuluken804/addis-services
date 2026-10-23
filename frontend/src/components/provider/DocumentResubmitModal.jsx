import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useResubmitDocument } from '@/hooks/useProviderPortal';

export function DocumentResubmitModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState(null);
  const { mutateAsync: resubmitDoc, isPending } = useResubmitDocument();

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Please upload a JPEG or PNG image.');
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB.');
      return;
    }

    setError(null);
    setFile(selected);
    setFilePreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose an image file.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('idDocument', file);
      await resubmitDoc(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload document.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 sm:p-8 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Re-submit Government ID</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Upload a clearer, uncropped photo of your National ID, Kebele ID, or Passport.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mt-3 flex items-start space-x-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center">
            {filePreview ? (
              <div className="space-y-3">
                <img src={filePreview} alt="New ID" className="mx-auto h-32 w-auto rounded-md object-cover" />
                <p className="text-xs font-semibold text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {file.name}
                </p>
                <label className="text-xs font-bold text-primary underline cursor-pointer">
                  Change photo
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="cursor-pointer space-y-2 flex flex-col items-center">
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-bold text-primary hover:underline">Select ID Photo</span>
                <p className="text-xs text-muted-foreground">JPEG, PNG (Max 10 MB)</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !file} className="rounded-md font-bold">
              {isPending ? 'Uploading...' : 'Submit Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
