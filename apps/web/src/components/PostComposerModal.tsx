import React, { useState } from "react";
import type { PhilosophicalPost } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";

export interface PostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostPublished?: (post: PhilosophicalPost) => void;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
}

const POST_TYPES: { id: PhilosophicalPost["postType"]; label: string; icon: string }[] = [
  { id: "argument", label: "Argument", icon: "⚔️" },
  { id: "thought_experiment", label: "Thought Experiment", icon: "🧪" },
  { id: "question", label: "Core Question", icon: "❓" },
  { id: "thesis", label: "Thesis / Proposition", icon: "📌" },
  { id: "essay", label: "Philosophical Essay", icon: "📖" },
];

export const PostComposerModal: React.FC<PostComposerModalProps> = ({
  isOpen,
  onClose,
  onPostPublished,
  authorName,
  authorHandle,
  authorAvatar,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PhilosophicalPost["postType"]>("argument");
  const [primarySchool, setPrimarySchool] = useState("");
  const [keyThinkersStr, setKeyThinkersStr] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsPublishing(true);
    setErrorMsg(null);

    const keyThinkers = keyThinkersStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const createdPost = await agoraClient.createPost({
        title: title.trim(),
        content: content.trim(),
        postType,
        primarySchool: primarySchool.trim() || "General Philosophy",
        keyThinkers: keyThinkers.length > 0 ? keyThinkers : ["Various Thinkers"],
        authorName,
        authorHandle,
        authorAvatar,
      });

      if (onPostPublished) onPostPublished(createdPost);
      setTitle("");
      setContent("");
      setPrimarySchool("");
      setKeyThinkersStr("");
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to publish post");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="settings-modal-pane" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <div className="header-title-block">
            <h3>✍️ Publish Philosophical Post</h3>
            <p className="settings-subtitle">
              Share an argument, thought experiment, or thesis with the community.
            </p>
          </div>
          <button className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="settings-form-body">
          {errorMsg && <div className="auth-error-alert">{errorMsg}</div>}

          {/* Post Type Selector */}
          <div className="form-group">
            <label className="section-label">Select Post Type</label>
            <div className="intent-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {POST_TYPES.map((type) => (
                <button
                  type="button"
                  key={type.id}
                  className={`intent-card ${postType === type.id ? "active" : ""}`}
                  onClick={() => setPostType(type.id)}
                >
                  <span className="intent-icon">{type.icon}</span>
                  <span className="intent-label" style={{ fontSize: "0.82rem" }}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Post Title */}
          <div className="form-group">
            <label className="section-label">Post Title / Central Question</label>
            <input
              type="text"
              className="input-text"
              required
              placeholder="e.g. On the Inevitability of Free Will in Deterministic Systems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Post Body */}
          <div className="form-group">
            <label className="section-label">Post Content & Argument Body</label>
            <textarea
              className="input-textarea"
              rows={5}
              required
              placeholder="Elaborate on your premises, conclusions, and philosophical context..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Taxonomy Details */}
          <div className="form-group highlight-box">
            <label className="section-label">🏛️ Philosophical Context (Optional)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
              <input
                type="text"
                className="input-text"
                placeholder="Primary School (e.g. Existentialism)"
                value={primarySchool}
                onChange={(e) => setPrimarySchool(e.target.value)}
              />
              <input
                type="text"
                className="input-text"
                placeholder="Key Thinkers (comma separated)"
                value={keyThinkersStr}
                onChange={(e) => setKeyThinkersStr(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="settings-actions">
            <button type="submit" className="save-submit-btn" disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "🚀 Publish Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
