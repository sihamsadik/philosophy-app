import React, { useState, useEffect } from "react";
import { PwaInstallModal } from "./PwaInstallModal.js";

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
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (inStandalone) {
      setIsStandalone(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsVisible(false);
      setIsGuideModalOpen(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      if (onInstalled) onInstalled();
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    const dismissedAt = localStorage.getItem("philosophy_pwa_install_dismissed");
    const isRecentlyDismissed = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 86400000;
    if (!isRecentlyDismissed && !inStandalone) {
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [onInstalled]);

  const handleInstallClick = async () => {
    const activePrompt = (window as any).deferredPwaPrompt || deferredPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        if (outcome === "accepted") {
          setIsVisible(false);
          setDeferredPrompt(null);
          (window as any).deferredPwaPrompt = null;
          if (onInstalled) onInstalled();
        } else {
          handleDismiss();
        }
      } catch (err) {
        console.error("Install prompt error:", err);
        setIsGuideModalOpen(true);
      }
      return;
    }

    setIsGuideModalOpen(true);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("philosophy_pwa_install_dismissed", Date.now().toString());
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {isVisible && (
        <div className="install-app-banner-overlay">
          <div className="install-app-banner-card">
            <button
              type="button"
              className="banner-close-btn"
              onClick={handleDismiss}
              title="Dismiss install prompt"
            >
              ✕
            </button>

            <div className="banner-body">
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
      )}

      <PwaInstallModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        deferredPrompt={deferredPrompt || (window as any).deferredPwaPrompt}
        onTriggerInstall={async () => {
          const p = deferredPrompt || (window as any).deferredPwaPrompt;
          if (p) {
            try {
              await p.prompt();
              const { outcome } = await p.userChoice;
              if (outcome === "accepted") {
                setIsVisible(false);
                setIsGuideModalOpen(false);
                setDeferredPrompt(null);
                (window as any).deferredPwaPrompt = null;
                if (onInstalled) onInstalled();
              }
            } catch (err) {
              console.error("Native install trigger error:", err);
            }
          }
        }}
      />
    </>
  );
};
