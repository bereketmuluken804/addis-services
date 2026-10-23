import React, { useState, useEffect } from 'react';
import { Phone, Copy, Check, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
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

  // Triggered when client initiates direct call via tel: anchor
  const handleCallClick = () => {
    if (provider?.id) {
      recordCallLead(provider.id);
    }
  };

  if (!provider) return null;

  const phone = provider.phone || '+251911000000';
  const formattedPhone = formatPhoneNumber(phone);

  const handleCopy = () => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalBody = (
    <div className="flex flex-col items-center text-center py-2">
      {/* Provider Avatar */}
      <div className="relative mb-3">
        {provider.avatarUrl ? (
          <img
            src={provider.avatarUrl}
            alt={provider.fullName}
            decoding="async"
            className="h-16 w-16 rounded-xl object-cover border border-border shadow-subtle"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-light text-xl font-bold font-heading text-primary border border-primary/20 shadow-subtle">
            {provider.fullName?.slice(0, 2).toUpperCase() || 'SP'}
          </div>
        )}
        
      </div>

      <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">
        {provider.fullName}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {provider.categoryName || provider.category?.nameEn || 'Verified Technician'} • {provider.subCityName || provider.subCity?.nameEn || 'Addis Ababa'}
      </p>

      {/* Phone Display (Clickable) */}
      <a
        href={`tel:${phone}`}
        onClick={handleCallClick}
        className="mt-5 w-full block rounded-lg border border-primary/20 bg-primary-light/40 p-4 text-center hover:bg-primary-light/60 transition-colors cursor-pointer group"
        title="Click to call directly"
      >
        <span className="block text-[11px] font-semibold text-primary uppercase tracking-wider">
          Mobile Number (Click to Call)
        </span>
        <span className="mt-1 block font-heading text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {formattedPhone}
        </span>
      </a>

      {/* Action Buttons */}
      <div className="mt-5 flex w-full flex-col gap-2.5 sm:flex-row">
        <a href={`tel:${phone}`} onClick={handleCallClick} className="flex-1">
          <Button
            size="default"
            className="w-full h-11 rounded-lg text-xs font-semibold shadow-subtle"
          >
            <Phone className="mr-2 h-4 w-4" />
            Call Directly
          </Button>
        </a>
        <Button
          size="default"
          variant="outline"
          onClick={handleCopy}
          className="h-11 rounded-lg px-4 text-xs font-semibold"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        Direct call with verified technician. No platform service fees or escrow.
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeCallModal()}>
        <DrawerContent className="p-5">
          {modalBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeCallModal()}>
      <DialogContent className="max-w-sm p-6 rounded-xl">
        {modalBody}
      </DialogContent>
    </Dialog>
  );
}
