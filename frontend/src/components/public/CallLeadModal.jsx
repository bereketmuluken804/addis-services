import React, { useState, useEffect } from 'react';
import { Phone, Copy, Check, ShieldCheck, ExternalLink, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCallModalStore } from '@/stores/callModalStore';
import { useCallLead } from '@/hooks/useCallLead';
import { formatPhoneNumber } from '@/lib/utils';

export function CallLeadModal() {
  const { isOpen, provider, closeCallModal } = useCallModalStore();
  const { mutate: recordCallLead } = useCallLead();
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Record call lead event when modal opens for a provider
  useEffect(() => {
    if (isOpen && provider?.id) {
      recordCallLead(provider.id);
    }
  }, [isOpen, provider?.id, recordCallLead]);

  if (!provider) return null;

  const phone = provider.phone || '+251911000000';
  const formattedPhone = formatPhoneNumber(phone);

  const handleCopy = () => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalBody = (
    <div className="flex flex-col items-center text-center py-3">
      {/* Provider Avatar & Shield */}
      <div className="relative mb-4">
        {provider.avatarUrl ? (
          <img
            src={provider.avatarUrl}
            alt={provider.fullName}
            className="h-20 w-20 rounded-2xl object-cover border-2 border-primary/20 shadow-md"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-light text-2xl font-bold font-heading text-primary border-2 border-primary/20 shadow-sm">
            {provider.fullName?.slice(0, 2).toUpperCase() || 'SP'}
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 rounded-full bg-card p-1 shadow-xs">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
        </div>
      </div>

      <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        {provider.fullName}
      </h3>
      <p className="mt-1 text-sm font-medium text-muted-foreground">
        {provider.categoryName || provider.category?.nameEn || 'Verified Pro'} • {provider.subCityName || provider.subCity?.nameEn || 'Addis Ababa'}
      </p>

      {/* Prominent Phone Display */}
      <div className="mt-7 w-full rounded-2xl border border-primary/20 bg-primary-light/40 p-5 text-center shadow-xs">
        <span className="block text-xs font-bold uppercase tracking-wider text-primary">
          Direct Phone Number
        </span>
        <span className="mt-1 block font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {formattedPhone}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
        <a href={`tel:${phone}`} className="flex-1">
          <Button
            size="lg"
            variant="default"
            className="w-full h-14 rounded-2xl text-base font-bold shadow-md hover:shadow-lg"
          >
            <Phone className="mr-2.5 h-5 w-5" />
            Call Now
          </Button>
        </a>
        <Button
          size="lg"
          variant="outline"
          onClick={handleCopy}
          className="h-14 rounded-2xl px-6 font-semibold"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-5 w-5 text-emerald-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-5 w-5" />
              Copy
            </>
          )}
        </Button>
      </div>

      <p className="mt-5 text-xs text-muted-foreground/80">
        Direct telephone call with verified local professional. No middleman service fee.
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeCallModal()}>
        <DrawerContent className="p-6">
          {modalBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeCallModal()}>
      <DialogContent className="max-w-md p-8">
        {modalBody}
      </DialogContent>
    </Dialog>
  );
}
