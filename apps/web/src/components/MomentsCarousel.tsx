import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient, type PhilosophyEvent, isRegisteredRSVP } from "../lib/api-client.js";

export interface MomentsCarouselProps {
  currentUser?: User | null;
  onOpenComposer: () => void;
  onSelectThinker?: (user: User) => void;
  onSelectEvent?: (event: PhilosophyEvent) => void;
  lastCreatedEvent?: PhilosophyEvent | null;
}

interface StoryCircleItem {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isLive: boolean;
  isUpcoming: boolean;
  userRsvpStatus?: "going" | "maybe" | "declined";
  priorityScore: number;
  event: PhilosophyEvent;
  hostUser: User;
}

export const MomentsCarousel: React.FC<MomentsCarouselProps> = ({
  currentUser,
  onOpenComposer,
  onSelectThinker,
  onSelectEvent,
  lastCreatedEvent,
}) => {
  const [dbEvents, setDbEvents] = useState<PhilosophyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    agoraClient
      .getEvents()
      .then((res) => {
        setDbEvents(res.events || []);
      })
      .catch((err) => {
        console.error("Failed to fetch events for story circles:", err);
        setDbEvents([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (lastCreatedEvent) {
      setDbEvents((prev) => {
        const exists = prev.some((e) => e.id === lastCreatedEvent.id);
        if (exists) return prev;
        return [lastCreatedEvent, ...prev];
      });
    }
  }, [lastCreatedEvent]);

  // Convert real DB events into story circle items & prioritize:
  // 1: Live + Registered (Going / Maybe)
  // 2: Live + Unresponded
  // 3: Upcoming + Registered (Going / Maybe)
  // 4: Upcoming + Unresponded
  // 5: Declined events (moved to the end, dimmed)
  const now = Date.now();
  const liveStoryCircles: StoryCircleItem[] = dbEvents
    .map((e) => {
      const start = new Date(e.startTime).getTime();
      const end = e.endTime ? new Date(e.endTime).getTime() : start + 2 * 3600 * 1000;
      const isLive = now >= start && now <= end;
      const isUpcoming = now < start;
      const rsvp = e.userRsvpStatus;
      const isReg = isRegisteredRSVP(rsvp);
      const isDeclined = rsvp === "declined";

      let priorityScore = 4;
      if (isLive && isReg) priorityScore = 1;
      else if (isLive && !isDeclined) priorityScore = 2;
      else if (isUpcoming && isReg) priorityScore = 3;
      else if (isUpcoming && !isDeclined) priorityScore = 4;
      else if (isDeclined) priorityScore = 5;

      const host = e.hostUser || {
        id: "usr-creator",
        name: "You (Host)",
        username: "you",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
      };

      return {
        id: e.id,
        name: host.name || host.username || e.title,
        username: host.username || "organizer",
        avatar: host.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
        isLive,
        isUpcoming,
        userRsvpStatus: rsvp,
        priorityScore,
        event: e,
        hostUser: host as User,
      };
    })
    .filter((item) => item.isLive || item.isUpcoming)
    .sort((a, b) => a.priorityScore - b.priorityScore);

  const handleItemClick = (item: StoryCircleItem) => {
    if (onSelectEvent) {
      onSelectEvent(item.event);
    } else if (onSelectThinker) {
      onSelectThinker(item.hostUser);
    }
  };

  return (
    <div className="moments-carousel-wrapper">
      <div className="moments-scroll-container" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Add Moment / Live Event Button */}
        <div className="moment-item" onClick={onOpenComposer} title="Create / Schedule Live Event">
          <div className="moment-avatar-ring add-moment-ring">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="User Avatar" className="moment-avatar-img" />
            ) : (
              <div className="moment-avatar-placeholder">
                {(currentUser?.name || currentUser?.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="add-moment-badge">+</div>
          </div>
          <span className="moment-label">Add live</span>
        </div>

        {/* Dynamic Real DB Story Circles List — Displays Registered Live Events First */}
        {liveStoryCircles.map((item) => {
          const isDeclined = item.userRsvpStatus === "declined";
          const isGoing = item.userRsvpStatus === "going";
          const isMaybe = item.userRsvpStatus === "maybe";

          let borderStyle = "2px solid #3b82f6";
          let boxShadowStyle = "0 0 10px rgba(59, 130, 246, 0.5)";
          let badgeBg = "#3b82f6";
          let badgeText = item.isLive ? "LIVE" : "SOON";
          let labelColor = "#60a5fa";

          if (isDeclined) {
            borderStyle = "2px dashed #64748b";
            boxShadowStyle = "none";
            badgeBg = "#475569";
            badgeText = "DECLINED";
            labelColor = "#94a3b8";
          } else if (item.isLive) {
            if (isGoing) {
              borderStyle = "2px solid #10b981";
              boxShadowStyle = "0 0 14px rgba(16, 185, 129, 0.7)";
              badgeBg = "#10b981";
              badgeText = "LIVE • GOING";
              labelColor = "#34d399";
            } else if (isMaybe) {
              borderStyle = "2px solid #f59e0b";
              boxShadowStyle = "0 0 12px rgba(245, 158, 11, 0.6)";
              badgeBg = "#f59e0b";
              badgeText = "LIVE • MAYBE";
              labelColor = "#fbbf24";
            } else {
              borderStyle = "2px solid #ef4444";
              boxShadowStyle = "0 0 12px rgba(239, 68, 68, 0.6)";
              badgeBg = "#ef4444";
              badgeText = "LIVE";
              labelColor = "#f87171";
            }
          }

          return (
            <div
              key={item.id}
              className={`moment-item ${isDeclined ? "declined-story-circle" : ""}`}
              onClick={() => handleItemClick(item)}
              style={{ opacity: isDeclined ? 0.6 : 1 }}
              title={
                isDeclined
                  ? `Declined (Can still join live): ${item.event.title}`
                  : item.isLive
                  ? `Live Now: ${item.event.title}`
                  : `Scheduled: ${item.event.title}`
              }
            >
              <div
                className="moment-avatar-ring active-ring"
                style={{
                  position: "relative",
                  border: borderStyle,
                  boxShadow: boxShadowStyle,
                }}
              >
                <img src={item.avatar} alt={item.name} className="moment-avatar-img" />
                <div
                  style={{
                    position: "absolute",
                    bottom: -4,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: badgeBg,
                    color: "#ffffff",
                    fontSize: "0.54rem",
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: 8,
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  {badgeText}
                </div>
              </div>
              <span
                className="moment-label"
                style={{
                  fontWeight: 700,
                  color: labelColor,
                }}
              >
                {item.name.split(" ")[0]}
              </span>
            </div>
          );
        })}

        {!isLoading && liveStoryCircles.length === 0 && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", marginLeft: 8 }}>
            No live or scheduled events right now. Click <strong>+</strong> to start one!
          </div>
        )}
      </div>
    </div>
  );
};

