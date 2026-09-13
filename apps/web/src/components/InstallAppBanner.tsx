import React, { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface InstallAppBannerProps {
  onInstalled?: () => void;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({ onInstalled }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (inStandalone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIPhoneOrIPad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIPhoneOrIPad);

    // Check if user previously dismissed
    const dismissedAt = localStorage.getItem("philosophy_pwa_install_dismissed");
    const isRecentlyDismissed = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 86400000 * 3; // 3 days

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isRecentlyDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      if (onInstalled) onInstalled();
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Show fallback for iOS if not installed & not dismissed
    if (isIPhoneOrIPad && !isRecentlyDismissed && !inStandalone) {
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [onInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        alert("To install Philosophy App on iOS:\n1. Tap the Share button in Safari (icon with box and arrow)\n2. Select 'Add to Home Screen' 📲");
      }
      return;
    }

    // Trigger native browser install prompt
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsVisible(false);
      setDeferredPrompt(null);
      if (onInstalled) onInstalled();
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("philosophy_pwa_install_dismissed", Date.now().toString());
  };

  if (!isVisible || isStandalone) {
    return null;
  }

  return (
    <div className="install-app-banner-overlay">
      <div className="install-app-banner-card">
        {/* Close Button */}
        <button
          type="button"
          className="banner-close-btn"
          onClick={handleDismiss}
          title="Dismiss install prompt"
        >
          ✕
        </button>

        <div className="banner-body">
          {/* App Icon Circle */}
          <div className="banner-icon-circle">
            <svg viewBox="0 0 512 512" width="32" height="32" fill="currentColor">
              <path fill="var(--primary-accent)" d="M256 32L32 160h448L256 32zM32 176v32h448v-32H32zm40 48v192h48V224H72zm96 0v192h48V224h-48zm96 0v192h48V224h-48zm96 0v192h48V224h-48zM32 432v40h448v-40H32z"/>
            </svg>
          </div>

          <div className="banner-text-block">
            <h4 className="banner-title">Install the app</h4>
            <p className="banner-description">
              Get it as a desktop & mobile app — its own standalone window, right from your home screen or taskbar.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="banner-actions">
          <button type="button" className="install-confirm-btn" onClick={handleInstallClick}>
            📲 INSTALL APP
          </button>
          <button type="button" className="install-dismiss-btn" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};
