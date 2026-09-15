import React, { useState, useEffect } from "react";
import type { EventType, PhilosophicalSpace, PhilosophyEvent } from "../lib/api-client.js";
import { agoraClient, DEMO_SPACES } from "../lib/api-client.js";
import { useAuth } from "../context/AuthContext.js";

export interface EventComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (event: PhilosophyEvent) => void;
  initialSpaceId?: string;
}

export const EventComposerModal: React.FC<EventComposerModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialSpaceId,
}) => {
  const { user } = useAuth();
  const [eventFormat, setEventFormat] = useState<"text_debate" | "video_meeting">("text_debate");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("live_debate");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [maxCapacity, setMaxCapacity] = useState<number>(30);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(initialSpaceId || "");
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spaces, setSpaces] = useState<PhilosophicalSpace[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Default datetime: set to current time for easy live testing!
      const now = new Date();
      now.setMinutes(now.getMinutes() - 2); // Set start time 2 mins ago so it becomes LIVE immediately!
      setStartTime(now.toISOString().slice(0, 16));

      agoraClient
        .getSpaces()
        .then((res) => setSpaces(res.spaces))
        .catch(() => setSpaces(DEMO_SPACES));

      if (initialSpaceId) {
        setSelectedSpaceId(initialSpaceId);
      }
    }
  }, [isOpen, initialSpaceId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !startTime) return;
    if (eventFormat === "video_meeting" && !locationUrl.trim()) {
      alert("Please provide an external meeting URL (e.g., Google Meet, Telegram, or Zoom link) for video meeting events.");
      return;
    }

    try {
      setIsSubmitting(true);
      const chosenSpace = spaces.find((s) => s.id === selectedSpaceId);
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const hostUserData = user || {
        id: "00000000-0000-0000-0000-000000000001",
        name: "You (Event Organizer)",
        username: "you",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        philosophyProfile: {
          primarySchools: ["Philosophy"],
          keyThinkers: ["Socrates"],
        },
      };

      const finalUrl =
        eventFormat === "video_meeting"
          ? locationUrl.trim()
          : locationUrl.trim() || "https://agora.philosophy/symposium/live";

      const created = await agoraClient.createEvent({
        title: title.trim(),
        type,
        description: description.trim(),
        startTime: new Date(startTime).toISOString(),
        locationUrl: finalUrl,
        maxCapacity: Number(maxCapacity) || 30,
        spaceId: chosenSpace?.id,
        spaceName: chosenSpace?.name,
        tags: tags.length > 0 ? tags : undefined,
        hostUser: hostUserData as any,
      });

      if (onCreated) {
        onCreated(created);
      }
      onClose();
      // Reset form
      setTitle("");
      setDescription("");
      setTagsInput("");
      setLocationUrl("");
    } catch (err) {
      console.error("Failed to create event:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeHostName = user?.name || user?.username || "You (Event Organizer)";
  const activeHostHandle = user?.username || "organizer";
  const activeHostAvatar = user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";
  const activeHostSchool = user?.philosophyProfile?.primarySchools?.[0] || "Philosophical Host";

  return (
    <div
      className="modal-backdrop"
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
        className="modal-pane event-composer-pane"
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 24,
          maxWidth: 620,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 24,
          color: "#f8fafc",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "1.8rem" }}>📅</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#f8fafc" }}>Schedule Philosophical Event</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                Host a virtual symposium, live debate, reading group, or interactive workshop.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Organizer Preview Card */}
        <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 16, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <img src={activeHostAvatar} alt="Host Avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #3b82f6" }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.72rem", color: "#60a5fa", fontWeight: 700, letterSpacing: "0.05em", display: "block" }}>EVENT CREATOR & HOST</span>
            <h4 style={{ margin: "2px 0 0 0", fontSize: "0.95rem", color: "#f8fafc" }}>{activeHostName} <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "0.82rem" }}>@{activeHostHandle}</span></h4>
            <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>📜 {activeHostSchool}</span>
          </div>
          <span style={{ background: "rgba(74, 222, 128, 0.15)", color: "#4ade80", border: "1px solid rgba(74, 222, 128, 0.3)", borderRadius: 10, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
            👑 Organizer
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Hosting Format Selector (Live Text Debate vs External Video Meeting) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>Hosting Medium & Format *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setEventFormat("text_debate");
                  setLocationUrl("");
                }}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: eventFormat === "text_debate" ? "2px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.15)",
                  background: eventFormat === "text_debate" ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  color: "#ffffff",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: eventFormat === "text_debate" ? "#60a5fa" : "#ffffff" }}>
                  💬 Live Text Debate Room
                </div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                  In-platform real-time chat debate (No Google Meet / Telegram needed)
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEventFormat("video_meeting");
                }}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: eventFormat === "video_meeting" ? "2px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.15)",
                  background: eventFormat === "video_meeting" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  color: "#ffffff",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: eventFormat === "video_meeting" ? "#f87171" : "#ffffff" }}>
                  📹 External Video Meeting
                </div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                  Google Meet, Telegram Voice/Video, Zoom, or YouTube link required
                </div>
              </button>
            </div>
          </div>

          {/* Event Title Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>Event Title *</label>
            <input
              type="text"
              placeholder="e.g. Compatibilism vs Hard Determinism: Live Formal Duel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff",
                fontSize: "0.92rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Type and Space Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>Event Category *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="live_debate">⚔️ Live Formal Debate</option>
                <option value="symposium">🏛️ Virtual Symposium</option>
                <option value="reading_group">📖 Reading Group</option>
                <option value="workshop">🧪 Interactive Workshop</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>Target Circle / Space</label>
              <select
                value={selectedSpaceId}
                onChange={(e) => setSelectedSpaceId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="">🌐 General Agora Community</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date/Time and Max Capacity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>Start Date & Time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>Max Capacity</label>
              <input
                type="number"
                min="5"
                max="500"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 30)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Conditional External Video Room Input */}
          {eventFormat === "video_meeting" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f87171" }}>
                External Meeting URL * (Google Meet, Telegram, Zoom, or YouTube)
              </label>
              <input
                type="url"
                placeholder="e.g. https://meet.google.com/abc-defg-hij or https://t.me/yourchannel"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  background: "rgba(239, 68, 68, 0.05)",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span style={{ fontSize: "0.78rem", color: "#fca5a5" }}>
                ⚠️ Required for Video Meetings: Host must paste Google Meet or Telegram live URL so attendees can join.
              </span>
            </div>
          ) : (
            <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px dashed rgba(59, 130, 246, 0.3)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.2rem" }}>💬</span>
              <span style={{ fontSize: "0.8rem", color: "#93c5fd" }}>
                Live Text Chat Debate will run directly inside Philosophy Agora. No external URL required!
              </span>
            </div>
          )}

          {/* Description & Agenda */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>Event Description & Agenda *</label>
            <textarea
              rows={4}
              placeholder="Describe the debate core thesis, reading materials, or event agenda..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff",
                fontSize: "0.92rem",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "transparent",
                color: "#94a3b8",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              }}
            >
              {isSubmitting ? "Publishing Event..." : "🚀 Schedule & Publish Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
