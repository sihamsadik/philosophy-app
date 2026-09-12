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
  if (!isOpen || !event) return null;

  const host = event.hostUser;
  const isVideoMeeting = !!(event.locationUrl && (
    event.locationUrl.includes("meet") ||
    event.locationUrl.includes("zoom") ||
    event.locationUrl.includes("t.me") ||
    event.locationUrl.includes("http")
  ));

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="live-event-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="live-event-modal-header">
          <div className="live-badge-row">
            <span className="live-pulse-badge">🔴 LIVE NOW</span>
            <span className="event-type-chip badge-debate">
              {event.type.toUpperCase().replace("_", " ")}
            </span>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Event Title & Summary */}
        <div className="live-event-body">
          <h2 className="live-event-title">{event.title}</h2>
          {event.spaceName && (
            <span className="space-context-tag" style={{ display: "inline-block", marginBottom: 10 }}>
              🏛️ Circle: {event.spaceName}
            </span>
          )}
          <p className="live-event-desc">{event.description}</p>
        </div>

        {/* Event Creator / Host Card */}
        <div className="live-host-card">
          <span className="host-card-label">EVENT CREATOR & HOST</span>
          <div className="host-identity-row">
            <img
              src={host.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
              alt={host.name || host.username || "Host"}
              className="host-large-avatar"
            />
            <div className="host-details">
              <h4 className="host-name">{host.name || host.username}</h4>
              <span className="host-handle">@{host.username || "organizer"}</span>
              <span className="host-school-tag">
                📜 {host.philosophyProfile?.primarySchools?.[0] || "Philosophical Host"}
              </span>
            </div>
            {onOpenDM && (
              <button
                type="button"
                className="action-btn"
                style={{ fontSize: "0.8rem", padding: "6px 12px", marginLeft: "auto" }}
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

        {/* Event Timing & Attendees Meta */}
        <div className="live-event-meta-grid">
          <div className="meta-card-item">
            <span className="meta-label">🕒 START TIME</span>
            <span className="meta-val">
              {new Date(event.startTime).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="meta-card-item">
            <span className="meta-label">👥 REGISTERED</span>
            <span className="meta-val">
              {event.attendeeCount} / {event.maxCapacity || "∞"} Thinkers
            </span>
          </div>
        </div>

        {/* Join Actions: Video Link vs Platform Text Debate */}
        <div className="live-event-actions-block">
          {isVideoMeeting ? (
            <a
              href={event.locationUrl}
              target="_blank"
              rel="noreferrer"
              className="join-external-video-btn"
            >
              📹 Join Live Video / Meeting (Google Meet / Zoom / Telegram)
            </a>
          ) : (
            <button
              type="button"
              className="join-in-platform-text-btn"
              onClick={() => {
                onClose();
                if (onOpenTextDebate) onOpenTextDebate(host);
              }}
            >
              💬 Open In-Platform Live Text Debate Room
            </button>
          )}

          <button type="button" className="install-dismiss-btn" onClick={onClose} style={{ width: "100%" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
