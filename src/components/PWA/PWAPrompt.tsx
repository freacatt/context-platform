import React, { useState, useEffect } from 'react';
import { usePWA } from '@/contexts/PWAContext';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY_PERMANENT = 'pwa-prompt-dismissed-permanently';
const STORAGE_KEY_TEMP = 'pwa-prompt-dismissed-until';

export const PWAPrompt: React.FC = () => {
  const { isInstallable, install } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isInstallable) {
      setIsVisible(false);
      return;
    }

    const checkVisibility = () => {
      const isPermanentlyDismissed = localStorage.getItem(STORAGE_KEY_PERMANENT) === 'true';
      if (isPermanentlyDismissed) return;

      const dismissedUntil = localStorage.getItem(STORAGE_KEY_TEMP);
      if (dismissedUntil) {
        const now = Date.now();
        if (now < parseInt(dismissedUntil, 10)) {
           // Still in timeout period, schedule check
           const remaining = parseInt(dismissedUntil, 10) - now;
           setTimeout(() => {
             // Re-check in case permanent dismissal happened in meantime (e.g. other tab)
             if (localStorage.getItem(STORAGE_KEY_PERMANENT) !== 'true') {
                setIsVisible(true);
             }
           }, remaining);
           return;
        }
      }
      
      setIsVisible(true);
    };

    checkVisibility();
  }, [isInstallable]);

  const handleClose = () => {
    setIsVisible(false);
    const dismissedUntil = Date.now() + 20000; // 20 seconds
    localStorage.setItem(STORAGE_KEY_TEMP, dismissedUntil.toString());
    
    // Reshow after 20s
    setTimeout(() => {
        if (isInstallable && localStorage.getItem(STORAGE_KEY_PERMANENT) !== 'true') {
             setIsVisible(true);
        }
    }, 20000);
  };

  const handleDontShowAgain = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY_PERMANENT, 'true');
  };

  const handleInstall = () => {
    install();
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-sm rounded-2xl border border-border/60 bg-background/80 shadow-lg backdrop-blur-xl md:bottom-6 md:inset-x-auto md:right-6 md:mx-0 md:w-full md:max-w-md"
        >
          <button 
            onClick={handleClose}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-start gap-3 px-4 py-4 pr-8 md:px-5 md:py-5">
            <div className="mt-1 rounded-xl bg-primary/10 p-2.5 text-primary">
              <Download size={24} />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-base font-semibold leading-snug">
                Install App
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Install our app for a better experience, offline access, and faster performance.
              </p>
              
              <div className="flex gap-2">
                <Button onClick={handleInstall} size="sm" className="flex-1">
                  Install
                </Button>
                <Button onClick={handleDontShowAgain} variant="outline" size="sm" className="flex-1">
                  Don't show again
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
