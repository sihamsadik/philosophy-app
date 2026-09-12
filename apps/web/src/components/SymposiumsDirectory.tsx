import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient, DEMO_EVENTS, DEMO_RSVPS, type EventType, type PhilosophyEvent, type EventRSVP, type RSVPStatus } from "../lib/api-client.js";
import { LiveEventJoinModal } from "./LiveEventJoinModal.js";

export interface SymposiumsDirectoryProps {
  onOpenComposer: () => void;
  onOpenDM?: (targetUser: User) => void;
  onOpenTextDebate?: (hostUser: User) => void;
}

export const SymposiumsDirectory: React.FC<SymposiumsDirectoryProps> = ({
  onOpenComposer,
  onOpenDM,
  onOpenTextDebate,
}) => {
  const [events, setEvents] = useState<PhilosophyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTypeTab, setActiveTypeTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventForRoster, setSelectedEventForRoster] = useState<PhilosophyEvent | null>(null);
  const [selectedLiveEvent, setSelectedLiveEvent] = useState<PhilosophyEvent | null>(null);
  const [rosterRsvps, setRosterRsvps] = useState<EventRSVP[]>([]);
  const [rosterTab, setRosterTab] = useState<"all" | RSVPStatus>("all");
  const [isRosterLoading, setIsRosterLoading] = useState(false);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const res = await agoraClient.getEvents(
        activeTypeTab !== "all" ? ({ type: activeTypeTab } as any) : undefined
      );
      setEvents(res.events);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setEvents(DEMO_EVENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [activeTypeTab]);

  const handleRsvp = async (eventId: string, status: RSVPStatus) => {
    try {
      const res = await agoraClient.rsvpEvent(eventId, status);
      if (res.event) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? res.event : e))
        );
      }
    } catch (err) {
      console.error("RSVP failed:", err);
    }
  };

  const handleOpenRoster = async (event: PhilosophyEvent) => {
    setSelectedEventForRoster(event);
    try {
      setIsRosterLoading(true);
      const res = await agoraClient.getEventRsvps(event.id);
      setRosterRsvps(res.rsvps);
    } catch (err) {
      console.error("Failed to load RSVPs:", err);
      setRosterRsvps(DEMO_RSVPS.filter((r) => r.eventId === event.id));
    } finally {
      setIsRosterLoading(false);
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "symposium":
        return { label: "🏛️ Symposium", colorClass: "badge-symposium" };
      case "live_debate":
        return { label: "⚔️ Live Debate", colorClass: "badge-debate" };
      case "reading_group":
        return { label: "📖 Reading Group", colorClass: "badge-reading" };
      case "workshop":
        return { label: "🧪 Workshop", colorClass: "badge-workshop" };
      default:
        return { label: "📅 Event", colorClass: "badge-default" };
    }
  };

  const getStatusCountdown = (startTimeStr: string, endTimeStr?: string) => {
    const start = new Date(startTimeStr).getTime();
    const end = endTimeStr ? new Date(endTimeStr).getTime() : start + 2 * 3600 * 1000;
    const now = Date.now();

    if (now >= start && now <= end) {
      return { status: "live", text: "🔴 LIVE NOW" };
    }
    if (now > end) {
      return { status: "past", text: "📜 Concluded" };
    }

    const diffMs = start - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return { status: "upcoming", text: `📅 In ${diffDays} day${diffDays > 1 ? "s" : ""}` };
    }
    if (diffHours > 0) {
      return { status: "upcoming", text: `⏳ Starts in ${diffHours}h` };
    }
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return { status: "upcoming", text: `⚡ Starts in ${diffMins}m` };
  };

  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      (e.hostUser.name && e.hostUser.name.toLowerCase().includes(q)) ||
      (e.hostUser.username && e.hostUser.username.toLowerCase().includes(q)) ||
      (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const filteredRsvps = rosterRsvps.filter((r) => {
    if (rosterTab === "all") return true;
    return r.status === rosterTab;
  });

  return (
    <div className="symposiums-directory-container">
      {/* Directory Hero Header */}
      <div className="directory-hero-banner">
        <div className="hero-badge">📅 PHILOSOPHICAL SYMPOSIUMS & LIVE EVENTS</div>
        <h2>Engage in Live Dialogue & Intellectual Assemblies</h2>
        <p>
          Gather with international thinkers for virtual symposiums, structured formal debates, weekly textual reading groups, and interactive workshops.
        </p>

        <div className="hero-actions-bar">
          <div className="search-box-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="directory-search-input"
              placeholder="Search symposiums by topic, Kant, ethics, host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button className="btn-primary schedule-hero-btn" onClick={onOpenComposer}>
            📅 Schedule Event
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="directory-tabs-bar">
        <button
          className={`tab-btn ${activeTypeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTypeTab("all")}
        >
          🔥 All Assemblies
        </button>
        <button
          className={`tab-btn ${activeTypeTab === "symposium" ? "active" : ""}`}
          onClick={() => setActiveTypeTab("symposium")}
        >
          🏛️ Symposiums
        </button>
        <button
          className={`tab-btn ${activeTypeTab === "live_debate" ? "active" : ""}`}
          onClick={() => setActiveTypeTab("live_debate")}
        >
          ⚔️ Live Debates
        </button>
        <button
          className={`tab-btn ${activeTypeTab === "reading_group" ? "active" : ""}`}
          onClick={() => setActiveTypeTab("reading_group")}
        >
          📖 Reading Groups
        </button>
        <button
          className={`tab-btn ${activeTypeTab === "workshop" ? "active" : ""}`}
          onClick={() => setActiveTypeTab("workshop")}
        >
          🧪 Workshops
        </button>
      </div>

      {/* Events Grid Directory */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading philosophical assemblies...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="empty-directory-card">
          <span className="empty-icon">🏛️</span>
          <h3>No events found</h3>
          <p>Be the first to host a symposium or reading group for the community.</p>
          <button className="btn-primary" onClick={onOpenComposer}>
            📅 Schedule First Symposium
          </button>
        </div>
      ) : (
        <div className="events-grid">
          {filteredEvents.map((event) => {
            const { label: typeLabel, colorClass } = getEventTypeLabel(event.type);
            const countdown = getStatusCountdown(event.startTime, event.endTime);

            return (
              <div key={event.id} className="event-card">
                {/* Event Header Badges */}
                <div className="event-card-header">
                  <span className={`event-type-chip ${colorClass}`}>{typeLabel}</span>
                  <span className={`status-countdown-chip ${countdown.status}`}>
                    {countdown.text}
                  </span>
                </div>

                {/* Event Title & Space Context */}
                <h3 className="event-title">{event.title}</h3>
                {event.spaceName && (
                  <span className="space-context-tag">
                    🏛️ {event.spaceName}
                  </span>
                )}

                <p className="event-description">{event.description}</p>

                {/* Host Identity */}
                <div className="event-host-row">
                  <img
                    src={event.hostUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
                    alt={event.hostUser.name || event.hostUser.username || "Host"}
                    className="host-avatar"
                  />
                  <div className="host-info">
                    <div className="host-name">{event.hostUser.name || event.hostUser.username}</div>
                    <div className="host-school">
                      {event.hostUser.philosophyProfile?.primarySchools?.[0] || "Host & Organizer"}
                    </div>
                  </div>
                </div>

                {/* Date, Time & Capacity Meta */}
                <div className="event-meta-box">
                  <div className="meta-item">
                    <span className="meta-icon">🕒</span>
                    <span>
                      {new Date(event.startTime).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="meta-item">
                    <span className="meta-icon">👥</span>
                    <span>
                      {event.attendeeCount} / {event.maxCapacity || "∞"} Registered
                    </span>
                  </div>

                  <div className="meta-item link-item">
                    <button
                      type="button"
                      className="room-link"
                      onClick={() => setSelectedLiveEvent(event)}
                      style={{ background: "transparent", border: "none", cursor: "pointer" }}
                    >
                      🔗 {countdown.status === "live" ? "🔴 Join Live Event" : "ℹ️ View Live Meeting Info"}
                    </button>
                  </div>
                </div>

                {/* Event Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="event-tags-row">
                    {event.tags.map((tag) => (
                      <span key={tag} className="event-tag-pill">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* RSVP Controls & Attendee Roster Action */}
                <div className="event-card-footer">
                  <div className="rsvp-segmented-group">
                    <button
                      className={`rsvp-btn going ${event.userRsvpStatus === "going" ? "active" : ""}`}
                      onClick={() => handleRsvp(event.id, "going")}
                    >
                      🟢 Going
                    </button>
                    <button
                      className={`rsvp-btn maybe ${event.userRsvpStatus === "maybe" ? "active" : ""}`}
                      onClick={() => handleRsvp(event.id, "maybe")}
                    >
                      🟡 Maybe
                    </button>
                    <button
                      className={`rsvp-btn declined ${event.userRsvpStatus === "declined" ? "active" : ""}`}
                      onClick={() => handleRsvp(event.id, "declined")}
                    >
                      🔴 Declined
                    </button>
                  </div>

                  <button
                    className="view-roster-btn"
                    onClick={() => handleOpenRoster(event)}
                  >
                    👥 Roster ({event.attendeeCount})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attendee Roster Drawer Modal */}
      {selectedEventForRoster && (
        <div className="modal-backdrop" onClick={() => setSelectedEventForRoster(null)}>
          <div
            className="modal-pane attendee-roster-pane"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon">👥</span>
                <div>
                  <h3>Attendee Roster</h3>
                  <p className="modal-subtitle">{selectedEventForRoster.title}</p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedEventForRoster(null)}
              >
                ✕
              </button>
            </div>

            {/* Roster Filter Tabs */}
            <div className="roster-tabs-bar">
              <button
                className={`roster-tab ${rosterTab === "all" ? "active" : ""}`}
                onClick={() => setRosterTab("all")}
              >
                All RSVPs ({rosterRsvps.length})
              </button>
              <button
                className={`roster-tab ${rosterTab === "going" ? "active" : ""}`}
                onClick={() => setRosterTab("going")}
              >
                🟢 Going ({rosterRsvps.filter((r) => r.status === "going").length})
              </button>
              <button
                className={`roster-tab ${rosterTab === "maybe" ? "active" : ""}`}
                onClick={() => setRosterTab("maybe")}
              >
                🟡 Maybe ({rosterRsvps.filter((r) => r.status === "maybe").length})
              </button>
            </div>

            {/* Roster List */}
            <div className="roster-list">
              {isRosterLoading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Fetching attendee roster...</p>
                </div>
              ) : filteredRsvps.length === 0 ? (
                <div className="empty-roster-state">
                  <p>No RSVPs matching this filter.</p>
                </div>
              ) : (
                filteredRsvps.map((rsvp) => (
                  <div key={rsvp.id} className="roster-item-card">
                    <img
                      src={rsvp.user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
                      alt={rsvp.user.name || rsvp.user.username || "Thinker"}
                      className="thinker-avatar"
                    />
                    <div className="thinker-info">
                      <div className="thinker-name-row">
                        <span className="thinker-name">{rsvp.user.name || rsvp.user.username}</span>
                        <span className={`rsvp-status-badge status-${rsvp.status}`}>
                          {rsvp.status === "going"
                            ? "🟢 Going"
                            : rsvp.status === "maybe"
                            ? "🟡 Maybe"
                            : "🔴 Declined"}
                        </span>
                      </div>
                      <div className="thinker-meta">
                        @{rsvp.user.username} • {rsvp.updatedAt}
                      </div>
                    </div>

                    {onOpenDM && (
                      <button
                        className="btn-dm-action"
                        onClick={() => {
                          onOpenDM(rsvp.user);
                          setSelectedEventForRoster(null);
                        }}
                      >
                        💬 DM
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Event Join / Creator Details Modal */}
      <LiveEventJoinModal
        isOpen={!!selectedLiveEvent}
        onClose={() => setSelectedLiveEvent(null)}
        event={selectedLiveEvent}
        onOpenDM={onOpenDM}
        onOpenTextDebate={onOpenTextDebate}
      />
    </div>
  );
};
