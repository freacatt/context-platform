import React, { createContext, useContext, useEffect, useState } from 'react';

interface PWAContextType {
  deferredPrompt: any;
  isInstallable: boolean;
  install: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      console.log('PWA: beforeinstallprompt event fired');
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
        setIsInstallable(false);
        setDeferredPrompt(null);
        console.log('PWA: App was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Debug mode for development
    if (window.location.search.includes('pwa-test=true')) {
        console.log('PWA: Debug mode enabled, forcing installable state');
        setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        // We don't clear deferredPrompt here immediately because user might cancel
        // But typically deferredPrompt can only be used once.
        setDeferredPrompt(null);
        setIsInstallable(false);
      });
    }
  };

  return (
    <PWAContext.Provider value={{ deferredPrompt, isInstallable, install }}>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
