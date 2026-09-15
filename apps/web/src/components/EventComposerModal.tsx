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
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("symposium");
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
      // Set default datetime to tomorrow at 18:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      setStartTime(tomorrow.toISOString().slice(0, 16));

      // Fetch spaces for dropdown
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

    try {
      setIsSubmitting(true);
      const chosenSpace = spaces.find((s) => s.id === selectedSpaceId);
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await agoraClient.createEvent({
        title: title.trim(),
        type,
        description: description.trim(),
        startTime: new Date(startTime).toISOString(),
        locationUrl: locationUrl.trim() || "https://agora.philosophy/symposium/live",
        maxCapacity: Number(maxCapacity) || 30,
        spaceId: chosenSpace?.id,
        spaceName: chosenSpace?.name,
        tags: tags.length > 0 ? tags : undefined,
        hostUser: user || undefined,
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
          maxWidth: 580,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 24,
          color: "#f8fafc",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">📅</span>
            <div>
              <h3>Schedule Philosophical Event</h3>
              <p className="modal-subtitle">
                Organize a virtual symposium, live debate, reading group, or interactive workshop.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="event-composer-form">
          <div className="form-group">
            <label className="form-label">Event Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Critique of Pure Reason: Transcendental Aesthetic Reading Group"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Event Type *</label>
              <select
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
                <option value="symposium">🏛️ Virtual Symposium</option>
                <option value="live_debate">⚔️ Live Formal Debate</option>
                <option value="reading_group">📖 Reading Group</option>
                <option value="workshop">🧪 Interactive Workshop</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Space / Circle</label>
              <select
                className="form-select"
                value={selectedSpaceId}
                onChange={(e) => setSelectedSpaceId(e.target.value)}
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Attendee Capacity</label>
              <input
                type="number"
                min="5"
                max="500"
                className="form-input"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Virtual Room / Video Call Link</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://agora.philosophy/symposium/live"
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Topics / Tags (comma separated)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Epistemology, Kant, Transcendental Idealism"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Event Description & Agenda *</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Describe the symposium agenda, target reading materials, or debate rules..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary schedule-event-btn"
              disabled={isSubmitting || !title.trim() || !description.trim()}
            >
              {isSubmitting ? "Scheduling Event..." : "🚀 Schedule Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
