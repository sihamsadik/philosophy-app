import React, { useState, useEffect, useRef } from "react";
import { Swords, FlaskConical, CircleQuestionMark, Pin, BookOpen, Landmark, Globe, PenLine, Rocket, X, ImagePlus } from "lucide-react";
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

const POST_TYPES: { id: PhilosophicalPost["postType"]; label: string; icon: React.ReactNode }[] = [
  { id: "argument", label: "Argument", icon: <Swords size={18} /> },
  { id: "thought_experiment", label: "Thought Experiment", icon: <FlaskConical size={18} /> },
  { id: "question", label: "Core Question", icon: <CircleQuestionMark size={18} /> },
  { id: "thesis", label: "Thesis / Proposition", icon: <Pin size={18} /> },
  { id: "essay", label: "Philosophical Essay", icon: <BookOpen size={18} /> },
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSpaceId) setSelectedSpaceId(initialSpaceId);
      agoraClient
        .getSpaces()
        .then((res) => setAvailableSpaces(res.spaces))
        .catch((err) => console.error("Failed to load spaces in composer:", err));
    }
  }, [isOpen, initialSpaceId]);

  // Clean up object URLs when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  if (!isOpen) return null;

  const currentAuthorName = authorName || user?.name || user?.username || "You (Thinker)";
  const currentAuthorHandle = authorHandle || user?.username || "you";
  const currentAuthorAvatar = authorAvatar || user?.avatar || undefined;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select an image file (JPEG, PNG, WebP, etc.)");
      return;
    }
    // Revoke old preview URL
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg(null);
  };

  const handleImageRemove = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Title is always required; content is required only when no image is attached
    if (!title.trim()) return;
    if (!content.trim() && !imageFile) return;

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
        spaceId: selectedSpaceId || initialSpaceId || undefined,
        primarySchool: primarySchool.trim() || matchedSpace?.primarySchool || "General Philosophy",
        keyThinkers: keyThinkers.length > 0 ? keyThinkers : matchedSpace?.keyThinkers || ["Various Thinkers"],
        authorName: currentAuthorName,
        authorHandle: currentAuthorHandle,
        authorAvatar: currentAuthorAvatar,
        image: imageFile || undefined,
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
      handleImageRemove();
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
            <h3><PenLine size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> Publish Philosophical Post</h3>
            <p className="settings-subtitle">
              Share an argument, thought experiment, or thesis with the community.
            </p>
          </div>
          <button className="close-drawer-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="settings-form-body">
          {errorMsg && <div className="auth-error-alert">{errorMsg}</div>}

          {/* Post Type Selector — LinkedIn-style icon toolbar */}
          <div className="form-group">
            <label className="section-label">Post Type</label>
            <div className="post-type-toolbar">
              {POST_TYPES.map((type) => (
                <button
                  type="button"
                  key={type.id}
                  className={`post-type-tool-btn ${postType === type.id ? "active" : ""}`}
                  onClick={() => setPostType(type.id)}
                  title={type.label}
                >
                  <span className="tool-icon">{type.icon}</span>
                  <span className="tool-label">{type.label}</span>
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
            <label className="section-label">Post Content & Argument Body {imageFile ? "(Optional with image)" : ""}</label>
            <textarea
              className="input-textarea"
              rows={5}
              required={!imageFile}
              placeholder="Elaborate on your premises, conclusions, and philosophical context..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            {/* Image Attach Toolbar */}
            <div className="image-attach-toolbar">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageSelect}
              />
              <button
                type="button"
                className="image-attach-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach an image to your post"
              >
                <ImagePlus size={16} />
                {imageFile ? "Change Image" : "Attach Image"}
              </button>
            </div>
            {/* Image Preview */}
            {imagePreview && (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Attachment preview" className="image-preview-img" />
                <button
                  type="button"
                  className="image-preview-remove"
                  onClick={handleImageRemove}
                  title="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Space Selector */}
          <div className="form-group">
            <label className="section-label"><Landmark size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Target Circle / Space (Optional)</label>
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
              <option value=""><Globe size={13} style={{ marginRight: 4 }} /> General Community Feed (No Specific Circle)</option>
              {availableSpaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.primarySchool || s.category})
                </option>
              ))}
            </select>
          </div>

          {/* Taxonomy Details */}
          <div className="form-group highlight-box">
            <label className="section-label"><Landmark size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Philosophical Context (Optional)</label>
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
              {isPublishing ? "Publishing..." : <><Rocket size={15} style={{ marginRight: 6, verticalAlign: "middle" }} /> Publish Post</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
