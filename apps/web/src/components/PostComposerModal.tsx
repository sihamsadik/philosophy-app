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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MiB cap matching server limit
  const MAX_IMAGES_COUNT = 10;

  useEffect(() => {
    if (isOpen) {
      if (initialSpaceId) setSelectedSpaceId(initialSpaceId);
      agoraClient
        .getSpaces()
        .then((res) => setAvailableSpaces(res.spaces))
        .catch((err) => console.error("Failed to load spaces in composer:", err));
    }
  }, [isOpen, initialSpaceId]);

  // Clean up object URLs when component unmounts or previews change
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  if (!isOpen) return null;

  const currentAuthorName = authorName || user?.name || user?.username || "You (Thinker)";
  const currentAuthorHandle = authorHandle || user?.username || "you";
  const currentAuthorAvatar = authorAvatar || user?.avatar || undefined;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    if (imageFiles.length + selected.length > MAX_IMAGES_COUNT) {
      setErrorMsg(`You can attach up to ${MAX_IMAGES_COUNT} images per post.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg(`"${file.name}" is not a supported image file (JPEG, PNG, WebP, GIF).`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setErrorMsg(`"${file.name}" exceeds the 25 MB file size limit.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setImageFiles((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (index: number) => {
    const urlToRemove = imagePreviews[index];
    if (urlToRemove) URL.revokeObjectURL(urlToRemove);

    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearAllImages = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublishing) return; // Prevent duplicate submissions

    const hasImages = imageFiles.length > 0;
    const hasText = title.trim().length > 0 || content.trim().length > 0;

    // Disallow completely empty posts (no text and no images)
    if (!hasImages && !hasText) {
      setErrorMsg("Please enter a title, content, or attach an image to create a post.");
      return;
    }

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
        images: imageFiles,
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
      clearAllImages();
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
            <label className="section-label">
              Post Title / Central Question {imageFiles.length > 0 ? "(Optional with images)" : ""}
            </label>
            <input
              type="text"
              className="input-text"
              required={imageFiles.length === 0 && !content.trim()}
              disabled={isPublishing}
              placeholder="e.g. On the Inevitability of Free Will in Deterministic Systems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Post Body */}
          <div className="form-group">
            <label className="section-label">
              Post Content & Argument Body {imageFiles.length > 0 ? "(Optional with images)" : ""}
            </label>
            <textarea
              className="input-textarea"
              rows={5}
              disabled={isPublishing}
              placeholder="Elaborate on your premises, conclusions, and philosophical context..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            {/* Image Attach Toolbar */}
            <div className="image-attach-toolbar">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                style={{ display: "none" }}
                onChange={handleImageSelect}
                disabled={isPublishing}
              />
              <button
                type="button"
                className="image-attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPublishing || imageFiles.length >= MAX_IMAGES_COUNT}
                title="Attach images to your post"
              >
                <ImagePlus size={16} />
                {imageFiles.length > 0 ? `Add More Images (${imageFiles.length}/${MAX_IMAGES_COUNT})` : "Attach Images"}
              </button>
            </div>
            {/* Image Previews Grid */}
            {imagePreviews.length > 0 && (
              <div className="image-previews-grid">
                {imagePreviews.map((previewUrl, idx) => (
                  <div key={idx} className="image-preview-item">
                    <img src={previewUrl} alt={`Attachment ${idx + 1}`} className="image-preview-thumb" />
                    <button
                      type="button"
                      className="image-preview-remove"
                      onClick={() => handleRemoveImage(idx)}
                      disabled={isPublishing}
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
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
              {isPublishing ? "Publishing with media..." : <><Rocket size={15} style={{ marginRight: 6, verticalAlign: "middle" }} /> Publish Post</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
