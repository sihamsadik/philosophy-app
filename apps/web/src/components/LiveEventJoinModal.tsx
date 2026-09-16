import React, { useState, useEffect, useRef } from "react";
import type { User } from "@philosophy/contract";
import type { PhilosophyEvent } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";
import { useAuth } from "../context/AuthContext.js";

export interface LiveEventJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: PhilosophyEvent | null;
  onOpenDM?: (user: User) => void;
  onOpenTextDebate?: (hostUser: User, event?: PhilosophyEvent) => void;
  onUpdateEvent?: (event: PhilosophyEvent) => void;
}

interface DebateMessage {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  stance: "thesis" | "antithesis" | "synthesis";
  content: string;
  timestamp: string;
  reactions: { upvotes: number; fire: number; insights: number };
}

export const LiveEventJoinModal: React.FC<LiveEventJoinModalProps> = ({
  isOpen,
  onClose,
  event,
  onOpenDM,
  onOpenTextDebate,
  onUpdateEvent,
}) => {
  const { user } = useAuth();
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [currentEvent, setCurrentEvent] = useState<PhilosophyEvent | null>(event);
  const [userComment, setUserComment] = useState("");
  const [selectedStance, setSelectedStance] = useState<"thesis" | "antithesis" | "synthesis">("antithesis");
  const [liveMessages, setLiveMessages] = useState<DebateMessage[]>([]);
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const chatStreamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem("agora_user_reactions_map");
      if (raw) setUserReactions(JSON.parse(raw));
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    setCurrentEvent(event);
    if (event) {
      agoraClient.getEventMessages(event.id).then((res) => {
        if (res.messages && res.messages.length > 0) {
          setLiveMessages(res.messages);
        } else {
          const initMsg: DebateMessage = {
            id: `init-${event.id}`,
            authorName: event.hostUser?.name || event.hostUser?.username || "Event Organizer",
            authorHandle: event.hostUser?.username || "organizer",
            authorAvatar: event.hostUser?.avatar || undefined,
            stance: "thesis",
            content: event.description || `Welcome to "${event.title}". Share your thesis, counter-rebuttal, or synthesis in this live text chat!`,
            timestamp: "Just now",
            reactions: { upvotes: 0, fire: 0, insights: 0 },
          };
          setLiveMessages([initMsg]);
        }
      });
    }
  }, [event]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !currentEvent) return null;

  const host = currentEvent.hostUser;
  const startTimeMs = new Date(currentEvent.startTime).getTime();
  const endTimeMs = currentEvent.endTime ? new Date(currentEvent.endTime).getTime() : startTimeMs + 2 * 3600 * 1000;
  const isLiveNow = nowTime >= startTimeMs && nowTime <= endTimeMs;
  const isPast = nowTime > endTimeMs;

  const isHost = !!(
    user &&
    (user.id === host.id ||
      user.username === host.username ||
      user.name === host.name ||
      host.username === "you" ||
      (host.name && host.name.includes("You")))
  );

  const handleStartLiveNow = () => {
    if (!currentEvent) return;
    const nowIso = new Date().toISOString();
    const updated: PhilosophyEvent = {
      ...currentEvent,
      startTime: nowIso,
      endTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      attendeeCount: Math.max(1, currentEvent.attendeeCount || 1),
    };
    setCurrentEvent(updated);
    if (onUpdateEvent) onUpdateEvent(updated);
    alert("🔴 Live Event Started! Your session is now live for all thinkers across the platform.");
  };

  const handleEndLiveNow = () => {
    if (!currentEvent) return;
    const endedIso = new Date(Date.now() - 1000).toISOString();
    const updated: PhilosophyEvent = {
      ...currentEvent,
      endTime: endedIso,
      attendeeCount: 0,
    };
    setCurrentEvent(updated);
    if (onUpdateEvent) onUpdateEvent(updated);
    alert("🏁 Live Event Concluded.");
  };

  const handleLeaveAndClose = () => {
    if (isLiveNow && currentEvent) {
      const remainingCount = Math.max(0, (currentEvent.attendeeCount || 1) - 1);
      if (remainingCount === 0 || isHost) {
        const endedIso = new Date().toISOString();
        const updated: PhilosophyEvent = {
          ...currentEvent,
          attendeeCount: 0,
          endTime: endedIso,
        };
        setCurrentEvent(updated);
        if (onUpdateEvent) onUpdateEvent(updated);
      } else {
        const updated: PhilosophyEvent = {
          ...currentEvent,
          attendeeCount: remainingCount,
        };
        setCurrentEvent(updated);
        if (onUpdateEvent) onUpdateEvent(updated);
      }
    }
    onClose();
  };

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

  // Accurate check for external video meeting URLs (Google Meet, Telegram, Zoom, YouTube)
  const isVideoMeeting = !!(
    currentEvent.locationUrl &&
    currentEvent.locationUrl !== "https://agora.philosophy/symposium/live" &&
    !currentEvent.locationUrl.includes("agora.philosophy") &&
    (currentEvent.locationUrl.includes("meet.google.com") ||
      currentEvent.locationUrl.includes("zoom.us") ||
      currentEvent.locationUrl.includes("t.me") ||
      currentEvent.locationUrl.includes("youtube.com") ||
      currentEvent.locationUrl.includes("meet") ||
      currentEvent.locationUrl.includes("video"))
  );

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userComment.trim() || !currentEvent) return;

    const authorName = user?.name || user?.username || "You (Thinker)";
    const authorHandle = user?.username || "you";
    const authorAvatar = user?.avatar || undefined;
    const contentText = userComment.trim();
    setUserComment("");

    const res = await agoraClient.postEventMessage(currentEvent.id, {
      authorName,
      authorHandle,
      authorAvatar,
      stance: selectedStance,
      content: contentText,
    });

    setLiveMessages((prev) => [...prev, res.message]);

    // Auto-scroll chat to bottom
    setTimeout(() => {
      if (chatStreamRef.current) {
        chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
      }
    }, 100);
  };



  const handleReaction = async (msgId: string, reactionType: "upvotes" | "fire" | "insights") => {
    if (!currentEvent) return;

    const prevReaction = userReactions[msgId] || null;
    const nextReaction = prevReaction === reactionType ? null : reactionType;

    const nextMap = { ...userReactions };
    if (nextReaction) {
      nextMap[msgId] = nextReaction;
    } else {
      delete nextMap[msgId];
    }
    setUserReactions(nextMap);

    setLiveMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const reactions = { ...(m.reactions || { upvotes: 0, fire: 0, insights: 0 }) };
          if (prevReaction === reactionType) {
            reactions[reactionType] = Math.max(0, (reactions[reactionType] || 0) - 1);
          } else {
            if (prevReaction && reactions[prevReaction as "upvotes" | "fire" | "insights"] > 0) {
              reactions[prevReaction as "upvotes" | "fire" | "insights"] -= 1;
            }
            reactions[reactionType] = (reactions[reactionType] || 0) + 1;
          }
          return { ...m, reactions };
        }
        return m;
      })
    );

    await agoraClient.reactToEventMessage(currentEvent.id, msgId, reactionType);
  };

  return (
    <div className="drawer-overlay" onClick={handleLeaveAndClose}>
      <div
        className="live-event-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 24,
        }}
      >
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
              {currentEvent.type.toUpperCase().replace("_", " ")}
            </span>
          </div>
          <button type="button" className="close-drawer-btn" onClick={handleLeaveAndClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        {/* Event Title & Summary */}
        <div className="live-event-body" style={{ margin: "4px 0" }}>
          <h2 className="live-event-title" style={{ margin: "0 0 8px 0", fontSize: "1.3rem" }}>{currentEvent.title}</h2>
          {currentEvent.spaceName && (
            <span className="space-context-tag" style={{ display: "inline-block", marginBottom: 8, fontSize: "0.82rem", color: "#38bdf8" }}>
              🏛️ Circle: {currentEvent.spaceName}
            </span>
          )}
          <p className="live-event-desc" style={{ color: "#cbd5e1", fontSize: "0.92rem", lineHeight: 1.5, margin: 0 }}>{currentEvent.description}</p>
        </div>

        {/* Event Creator / Host Card */}
        <div className="live-host-card" style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 16, padding: 14 }}>
          <span className="host-card-label" style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
            EVENT CREATOR & HOST {isHost ? "👑 (YOU)" : ""}
          </span>
          <div className="host-identity-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={host.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
              alt={host.name || host.username || "Host"}
              className="host-large-avatar"
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
            />
            <div className="host-details" style={{ flex: 1 }}>
              <h4 className="host-name" style={{ margin: 0, fontSize: "0.98rem" }}>{host.name || host.username}</h4>
              <span className="host-handle" style={{ fontSize: "0.8rem", color: "#94a3b8" }}>@{host.username || "organizer"}</span>
              <div style={{ fontSize: "0.78rem", color: "#60a5fa", marginTop: 2 }}>
                📜 {host.philosophyProfile?.primarySchools?.[0] || "Philosophical Host"}
              </div>
            </div>
            {!isHost && onOpenDM && (
              <button
                type="button"
                className="action-btn"
                style={{ fontSize: "0.8rem", padding: "6px 12px", background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#ffffff", borderRadius: 8, cursor: "pointer" }}
                onClick={() => {
                  handleLeaveAndClose();
                  onOpenDM(host);
                }}
              >
                💬 DM Host
              </button>
            )}
          </div>
        </div>

        {/* Real-time Attendees & Room Stats */}
        <div className="live-event-meta-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="meta-card-item" style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, padding: 10, textAlign: "center" }}>
            <span className="meta-label" style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>🕒 START TIME</span>
            <span className="meta-val" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f8fafc" }}>
              {new Date(currentEvent.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="meta-card-item" style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, padding: 10, textAlign: "center" }}>
            <span className="meta-label" style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>👁️ LIVE VIEWERS</span>
            <span className="meta-val" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#4ade80" }}>
              {isLiveNow ? `${currentEvent.attendeeCount} Active` : "Scheduled"}
            </span>
          </div>

          <div className="meta-card-item" style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 12, padding: 10, textAlign: "center" }}>
            <span className="meta-label" style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>👥 CAPACITY</span>
            <span className="meta-val" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f8fafc" }}>
              {currentEvent.attendeeCount} / {currentEvent.maxCapacity || "∞"}
            </span>
          </div>
        </div>

        {/* Format Indicator Banner */}
        <div style={{ background: isVideoMeeting ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)", border: isVideoMeeting ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>{isVideoMeeting ? "📹" : "💬"}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isVideoMeeting ? "#f87171" : "#60a5fa", display: "block" }}>
              {isVideoMeeting ? "EXTERNAL VIDEO MEETING SESSION" : "IN-PLATFORM LIVE TEXT DEBATE CHAT ROOM"}
            </span>
            <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
              {isVideoMeeting
                ? "Hosted via external video link (Google Meet / Telegram / Zoom)."
                : "Real-time group text debate chat directly inside Philosophy Agora."}
            </span>
          </div>
        </div>

        {/* HOST EXCLUSIVE CONTROLS: Start & End Live Event */}
        {isHost && (
          <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 16, padding: 14 }}>
            <span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 700, display: "block", marginBottom: 8 }}>
              ⚡ HOST CONTROLS (YOU CREATED THIS EVENT)
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              {!isLiveNow && (
                <button
                  type="button"
                  onClick={handleStartLiveNow}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(34, 197, 94, 0.4)",
                  }}
                >
                  {isPast ? "🔄 Restart Live Event" : "▶️ Start Live Event Now"}
                </button>
              )}

              {isLiveNow && (
                <button
                  type="button"
                  onClick={handleEndLiveNow}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                  }}
                >
                  ⏹️ End Live Session
                </button>
              )}
            </div>
          </div>
        )}

        {/* EMBEDDED LIVE TEXT CHAT ROOM FOR IN-PLATFORM TEXT DEBATES */}
        {!isVideoMeeting && (
          <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#38bdf8" }}>💬 LIVE DEBATE CHAT STREAM</span>
              <span style={{ fontSize: "0.75rem", color: "#4ade80", fontWeight: 600 }}>● Active Debate</span>
            </div>

            {/* Chat Stream Messages Box */}
            <div ref={chatStreamRef} style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
              {liveMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: msg.stance === "thesis" ? "1px solid rgba(74, 222, 128, 0.3)" : msg.stance === "antithesis" ? "1px solid rgba(248, 113, 113, 0.3)" : "1px solid rgba(168, 85, 247, 0.3)",
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <img src={msg.authorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#f8fafc" }}>{msg.authorName}</span>
                    </div>
                    <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: 8, background: msg.stance === "thesis" ? "rgba(74, 222, 128, 0.15)" : msg.stance === "antithesis" ? "rgba(248, 113, 113, 0.15)" : "rgba(168, 85, 247, 0.15)", color: msg.stance === "thesis" ? "#4ade80" : msg.stance === "antithesis" ? "#f87171" : "#c084fc", fontWeight: 700 }}>
                      {msg.stance.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 8px 0", fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.4 }}>{msg.content}</p>
                  
                  {/* Reactions */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleReaction(msg.id, "upvotes")}
                      style={{
                        background: userReactions[msg.id] === "upvotes" ? "rgba(59, 130, 246, 0.25)" : "rgba(255,255,255,0.06)",
                        border: userReactions[msg.id] === "upvotes" ? "1px solid rgba(59, 130, 246, 0.5)" : "1px solid transparent",
                        borderRadius: 6,
                        padding: "2px 6px",
                        color: userReactions[msg.id] === "upvotes" ? "#60a5fa" : "#cbd5e1",
                        fontSize: "0.72rem",
                        fontWeight: userReactions[msg.id] === "upvotes" ? 700 : 400,
                        cursor: "pointer",
                      }}
                    >
                      👍 {msg.reactions?.upvotes || 0}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReaction(msg.id, "fire")}
                      style={{
                        background: userReactions[msg.id] === "fire" ? "rgba(239, 68, 68, 0.25)" : "rgba(255,255,255,0.06)",
                        border: userReactions[msg.id] === "fire" ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid transparent",
                        borderRadius: 6,
                        padding: "2px 6px",
                        color: userReactions[msg.id] === "fire" ? "#f87171" : "#cbd5e1",
                        fontSize: "0.72rem",
                        fontWeight: userReactions[msg.id] === "fire" ? 700 : 400,
                        cursor: "pointer",
                      }}
                    >
                      🔥 {msg.reactions?.fire || 0}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReaction(msg.id, "insights")}
                      style={{
                        background: userReactions[msg.id] === "insights" ? "rgba(168, 85, 247, 0.25)" : "rgba(255,255,255,0.06)",
                        border: userReactions[msg.id] === "insights" ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid transparent",
                        borderRadius: 6,
                        padding: "2px 6px",
                        color: userReactions[msg.id] === "insights" ? "#c084fc" : "#cbd5e1",
                        fontSize: "0.72rem",
                        fontWeight: userReactions[msg.id] === "insights" ? 700 : 400,
                        cursor: "pointer",
                      }}
                    >
                      💡 {msg.reactions?.insights || 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleSendComment} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setSelectedStance("thesis")}
                  style={{ flex: 1, padding: "4px", borderRadius: 6, border: "1px solid rgba(74, 222, 128, 0.4)", background: selectedStance === "thesis" ? "rgba(74, 222, 128, 0.25)" : "transparent", color: "#4ade80", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                >
                  🟢 Thesis
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStance("antithesis")}
                  style={{ flex: 1, padding: "4px", borderRadius: 6, border: "1px solid rgba(248, 113, 113, 0.4)", background: selectedStance === "antithesis" ? "rgba(248, 113, 113, 0.25)" : "transparent", color: "#f87171", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                >
                  🔴 Antithesis
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStance("synthesis")}
                  style={{ flex: 1, padding: "4px", borderRadius: 6, border: "1px solid rgba(168, 85, 247, 0.4)", background: selectedStance === "synthesis" ? "rgba(168, 85, 247, 0.25)" : "transparent", color: "#c084fc", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                >
                  ⚪ Synthesis
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Type real-time argument or comment..."
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment(e);
                    }
                  }}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.15)", background: "rgba(255, 255, 255, 0.05)", color: "#ffffff", fontSize: "0.85rem", outline: "none" }}
                />
                <button type="submit" style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                  Send 💬
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Actions & Close Button */}
        <div className="live-event-actions-block" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          {isVideoMeeting ? (
            <a
              href={currentEvent.locationUrl}
              target="_blank"
              rel="noreferrer"
              className="join-external-video-btn"
              onClick={() => {
                if (onUpdateEvent && currentEvent) {
                  const updated = { ...currentEvent, attendeeCount: (currentEvent.attendeeCount || 0) + 1 };
                  setCurrentEvent(updated);
                  onUpdateEvent(updated);
                }
                setTimeout(() => onClose(), 500);
              }}
              style={{ padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#ffffff", fontWeight: 700, textDecoration: "none", textAlign: "center", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)", display: "block" }}
            >
              📹 Join Video Call (Google Meet / Telegram / Zoom)
            </a>
          ) : (
            <button
              type="button"
              className="expand-full-text-btn"
              onClick={() => {
                if (onUpdateEvent && currentEvent) {
                  const updated = { ...currentEvent, attendeeCount: (currentEvent.attendeeCount || 0) + 1 };
                  setCurrentEvent(updated);
                  onUpdateEvent(updated);
                }
                onClose();
                if (onOpenTextDebate) onOpenTextDebate(host, currentEvent);
              }}
              style={{ padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#ffffff", fontWeight: 700, fontSize: "0.92rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)" }}
            >
              🚀 Expand to Full Screen Live Text Debate Room
            </button>
          )}

          <button type="button" className="install-dismiss-btn" onClick={onClose} style={{ padding: "10px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.15)", background: "transparent", color: "#94a3b8", cursor: "pointer", fontWeight: 600 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

