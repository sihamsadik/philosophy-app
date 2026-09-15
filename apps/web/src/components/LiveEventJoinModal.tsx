import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import type { PhilosophyEvent } from "../lib/api-client.js";

export interface LiveEventJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: PhilosophyEvent | null;
  onOpenDM?: (user: User) => void;
  onOpenTextDebate?: (hostUser: User) => void;
}

export const LiveEventJoinModal: React.FC<LiveEventJoinModalProps> = ({
  isOpen,
  onClose,
  event,
  onOpenDM,
  onOpenTextDebate,
}) => {
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const host = event.hostUser;
  const startTimeMs = new Date(event.startTime).getTime();
  const endTimeMs = event.endTime ? new Date(event.endTime).getTime() : startTimeMs + 2 * 3600 * 1000;
  const isLiveNow = nowTime >= startTimeMs && nowTime <= endTimeMs;
  const isPast = nowTime > endTimeMs;

  const getTimingText = () => {
    if (isLiveNow) {
      const elapsedMins = Math.floor((nowTime - startTimeMs) / 60000);
      return `🔴 LIVE NOW (${elapsedMins}m elapsed)`;
    }
    if (isPast) {
      return `📜 Event Concluded`;
    }
    const diffMs = startTimeMs - nowTime;
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    const hours = Math.floor(mins / 60);

    if (hours > 0) {
      return `⏳ Starts in ${hours}h ${mins % 60}m ${secs}s`;
    }
    return `⚡ Starts in ${mins}m ${secs}s`;
  };

  const isVideoMeeting = !!(
    event.locationUrl &&
    (event.locationUrl.includes("meet") ||
      event.locationUrl.includes("zoom") ||
      event.locationUrl.includes("t.me") ||
      event.locationUrl.includes("http"))
  );

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="live-event-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: "100%" }}>
        {/* Modal Header */}
        <div className="live-event-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="live-badge-row" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              className="live-pulse-badge"
              style={{
                background: isLiveNow ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)",
                color: isLiveNow ? "#ef4444" : "#60a5fa",
                border: isLiveNow ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(59, 130, 246, 0.4)",
                padding: "4px 10px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: "0.8rem",
              }}
            >
              {getTimingText()}
            </span>
            <span className="event-type-chip badge-debate">
              {event.type.toUpperCase().replace("_", " ")}
            </span>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        {/* Event Title & Summary */}
        <div className="live-event-body" style={{ margin: "16px 0" }}>
          <h2 className="live-event-title" style={{ margin: "0 0 8px 0", fontSize: "1.3rem" }}>{event.title}</h2>
          {event.spaceName && (
            <span className="space-context-tag" style={{ display: "inline-block", marginBottom: 10, fontSize: "0.82rem", color: "#38bdf8" }}>
              🏛️ Circle: {event.spaceName}
            </span>
          )}
          <p className="live-event-desc" style={{ color: "#cbd5e1", fontSize: "0.92rem", lineHeight: 1.5, margin: 0 }}>{event.description}</p>
        </div>

        {/* Event Creator / Host Card */}
        <div className="live-host-card" style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 16, padding: 14, marginBottom: 16 }}>
          <span className="host-card-label" style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>EVENT CREATOR & HOST</span>
          <div className="host-identity-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={host.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
              alt={host.name || host.username || "Host"}
              className="host-large-avatar"
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
            />
            <div className="host-details" style={{ flex: 1 }}>
              <h4 className="host-name" style={{ margin: 0, fontSize: "1rem" }}>{host.name || host.username}</h4>
              <span className="host-handle" style={{ fontSize: "0.8rem", color: "#94a3b8" }}>@{host.username || "organizer"}</span>
              <div style={{ fontSize: "0.78rem", color: "#60a5fa", marginTop: 2 }}>
                📜 {host.philosophyProfile?.primarySchools?.[0] || "Philosophical Host"}
              </div>
            </div>
            {onOpenDM && (
              <button
                type="button"
                className="action-btn"
                style={{ fontSize: "0.8rem", padding: "6px 12px", background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff", borderRadius: 8, cursor: "pointer" }}
                onClick={() => {
                  onClose();
                  onOpenDM(host);
                }}
              >
                💬 DM Host
              </button>
            )}
          </div>
        </div>

        {/* Real-time Attendees & Room Stats */}
        <div className="live-event-meta-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div className="meta-card-item" style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, padding: 10, textAlign: "center" }}>
            <span className="meta-label" style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>🕒 TIME</span>
            <span className="meta-val" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f8fafc" }}>
              {new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="meta-card-item" style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, padding: 10, textAlign: "center" }}>
            <span className="meta-label" style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>👁️ LIVE VIEWERS</span>
            <span className="meta-val" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#4ade80" }}>
              {isLiveNow ? `${event.attendeeCount + 14} Active` : "Upcoming"}
            </span>
          </div>

          <div className="meta-card-item" style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, padding: 10, textAlign: "center" }}>
            <span className="meta-label" style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>👥 REGISTERED</span>
            <span className="meta-val" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f8fafc" }}>
              {event.attendeeCount} / {event.maxCapacity || "∞"}
            </span>
          </div>
        </div>

        {/* Join Actions: Video Link vs Platform Text Debate */}
        <div className="live-event-actions-block" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {isVideoMeeting ? (
            <a
              href={event.locationUrl}
              target="_blank"
              rel="noreferrer"
              className="join-external-video-btn"
              style={{ padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#ffffff", fontWeight: 700, textDecoration: "none", textAlign: "center", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)" }}
            >
              📹 Join Live Video Meeting (Google Meet / Zoom / Telegram)
            </a>
          ) : null}

          <button
            type="button"
            className="join-in-platform-text-btn"
            onClick={() => {
              onClose();
              if (onOpenTextDebate) onOpenTextDebate(host);
            }}
            style={{ padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#ffffff", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)" }}
          >
            💬 Open In-Platform Real-Time Live Debate Room
          </button>

          <button type="button" className="install-dismiss-btn" onClick={onClose} style={{ padding: "10px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.15)", background: "transparent", color: "#94a3b8", cursor: "pointer", fontWeight: 600 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
