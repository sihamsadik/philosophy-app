import React from "react";

export interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onTriggerInstall: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerInstall,
}) => {
  if (!isOpen) return null;

  const isLocalNetworkIp =
    !window.isSecureContext &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  return (
    <div
      className="pwa-install-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="pwa-install-modal-card"
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 24,
          maxWidth: 440,
          width: "100%",
          padding: 24,
          color: "#f8fafc",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.8rem" }}>📲</span>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#f8fafc" }}>Philosophy App</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {deferredPrompt ? (
          <div>
            <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 20px 0" }}>
              Click below to automatically install Philosophy App on your device.
            </p>
            <button
              type="button"
              onClick={onTriggerInstall}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "1.05rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                marginBottom: 12,
              }}
            >
              📲 Install App Now (1-Click)
            </button>
          </div>
        ) : isLocalNetworkIp ? (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🌐</div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", color: "#f59e0b" }}>
              Local Wi-Fi Connection (HTTP)
            </h4>
            <p style={{ color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 16px 0" }}>
              You are connected via your local PC network IP address (<code>{window.location.hostname}</code>).
            </p>
            <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 12, padding: 12, marginBottom: 16, textAlign: "left", fontSize: "0.85rem", color: "#fcd34d" }}>
              <strong>🔒 Browser Security Requirement:</strong><br />
              Chrome blocks mobile PWA installation over plain HTTP local IPs.<br />
              Once deployed to a live server with <strong>HTTPS</strong> (Vercel, Netlify, Firebase) or run via HTTPS tunnel, 1-click mobile installation works automatically!
            </div>
          </div>
        ) : isIOS ? (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🍎</div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", color: "#38bdf8" }}>
              Install on iOS Safari
            </h4>
            <p style={{ color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 16px 0" }}>
              Tap the <strong>Share</strong> button in Safari (box with up arrow) and select <strong>"Add to Home Screen"</strong> 📲.
            </p>
          </div>
        ) : isStandalone ? (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🎉</div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", color: "#4ade80" }}>
              Running in App Window!
            </h4>
            <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 20px 0" }}>
              You are currently using Philosophy App as an installed standalone app.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>✅</div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", color: "#60a5fa" }}>
              Already Installed on PC!
            </h4>
            <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 20px 0" }}>
              Philosophy App is already installed on this computer. Look for <strong>Open in app</strong> in your browser address bar (top right) or launch it from your desktop applications!
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            background: "transparent",
            color: "#94a3b8",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
