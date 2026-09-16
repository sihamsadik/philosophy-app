import React, { useState, useEffect } from "react";
import type { PhilosophicalPost, PhilosophicalSpace } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";
import { useAuth } from "../context/AuthContext.js";

export interface PostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostPublished?: (post: PhilosophicalPost) => void;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  initialSpaceId?: string;
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
  initialSpaceId,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PhilosophicalPost["postType"]>("argument");
  const [primarySchool, setPrimarySchool] = useState("");
  const [keyThinkersStr, setKeyThinkersStr] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(initialSpaceId || "");
  const [availableSpaces, setAvailableSpaces] = useState<PhilosophicalSpace[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSpaceId) setSelectedSpaceId(initialSpaceId);
      agoraClient
        .getSpaces()
        .then((res) => setAvailableSpaces(res.spaces))
        .catch((err) => console.error("Failed to load spaces in composer:", err));
    }
  }, [isOpen, initialSpaceId]);

  if (!isOpen) return null;

  const currentAuthorName = authorName || user?.name || user?.username || "You (Thinker)";
  const currentAuthorHandle = authorHandle || user?.username || "you";
  const currentAuthorAvatar = authorAvatar || user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsPublishing(true);
    setErrorMsg(null);

    const keyThinkers = keyThinkersStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const matchedSpace = availableSpaces.find((s) => s.id === selectedSpaceId);

    try {
      const createdPost = await agoraClient.createPost({
        title: title.trim(),
        content: content.trim(),
        postType,
        primarySchool: primarySchool.trim() || matchedSpace?.primarySchool || "General Philosophy",
        keyThinkers: keyThinkers.length > 0 ? keyThinkers : matchedSpace?.keyThinkers || ["Various Thinkers"],
        authorName: currentAuthorName,
        authorHandle: currentAuthorHandle,
        authorAvatar: currentAuthorAvatar,
      });

      // Attach space metadata if selected
      if (matchedSpace) {
        createdPost.spaceId = matchedSpace.id;
        createdPost.spaceName = matchedSpace.name;
      }

      if (onPostPublished) onPostPublished(createdPost);
      setTitle("");
      setContent("");
      setPrimarySchool("");
      setKeyThinkersStr("");
      setSelectedSpaceId("");
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

          {/* Space Selector */}
          <div className="form-group">
            <label className="section-label">🏛️ Target Circle / Space (Optional)</label>
            <select
              className="input-text"
              value={selectedSpaceId}
              onChange={(e) => {
                const spaceId = e.target.value;
                setSelectedSpaceId(spaceId);
                const matched = availableSpaces.find((s) => s.id === spaceId);
                if (matched && matched.primarySchool) {
                  setPrimarySchool(matched.primarySchool);
                }
              }}
            >
              <option value="">🌐 General Community Feed (No Specific Circle)</option>
              {availableSpaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.primarySchool || s.category})
                </option>
              ))}
            </select>
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
