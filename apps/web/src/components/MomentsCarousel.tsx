import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient, type PhilosophyEvent } from "../lib/api-client.js";

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

  // Convert real DB events into story circle items (both LIVE and UPCOMING scheduled)
  const now = Date.now();
  const liveStoryCircles: StoryCircleItem[] = dbEvents
    .map((e) => {
      const start = new Date(e.startTime).getTime();
      const end = e.endTime ? new Date(e.endTime).getTime() : start + 2 * 3600 * 1000;
      const isLive = now >= start && now <= end;
      const isUpcoming = now < start;

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
        event: e,
        hostUser: host as User,
      };
    })
    .filter((item) => item.isLive || item.isUpcoming);

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

        {/* Dynamic Real DB Story Circles List — Displays Newly Created Events First */}
        {liveStoryCircles.map((item) => (
          <div
            key={item.id}
            className="moment-item"
            onClick={() => handleItemClick(item)}
            title={item.isLive ? `Live Now: ${item.event.title}` : `Scheduled: ${item.event.title}`}
          >
            <div
              className="moment-avatar-ring active-ring"
              style={{
                position: "relative",
                border: item.isLive ? "2px solid #ef4444" : "2px solid #3b82f6",
                boxShadow: item.isLive ? "0 0 12px rgba(239, 68, 68, 0.6)" : "0 0 10px rgba(59, 130, 246, 0.5)",
              }}
            >
              <img src={item.avatar} alt={item.name} className="moment-avatar-img" />
              <div
                style={{
                  position: "absolute",
                  bottom: -4,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: item.isLive ? "#ef4444" : "#3b82f6",
                  color: "#ffffff",
                  fontSize: "0.58rem",
                  fontWeight: 800,
                  padding: "1px 5px",
                  borderRadius: 8,
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  boxShadow: item.isLive ? "0 2px 6px rgba(239, 68, 68, 0.5)" : "0 2px 6px rgba(59, 130, 246, 0.5)",
                }}
              >
                {item.isLive ? "LIVE" : "SOON"}
              </div>
            </div>
            <span
              className="moment-label"
              style={{
                fontWeight: 700,
                color: item.isLive ? "#f87171" : "#60a5fa",
              }}
            >
              {item.name.split(" ")[0]}
            </span>
          </div>
        ))}

        {!isLoading && liveStoryCircles.length === 0 && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", marginLeft: 8 }}>
            No live or scheduled events right now. Click <strong>+</strong> to start one!
          </div>
        )}
      </div>
    </div>
  );
};
