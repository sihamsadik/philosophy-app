import React, { useState, useEffect } from "react";
import type { PhilosophicalPost, PhilosophicalComment } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";
import { useAuth } from "../context/AuthContext.js";

export interface DebateThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string | null;
  targetCommentId?: string | null;
  postTitle?: string;
  postAuthorId?: string;
  postAuthorName?: string;
  postAuthorHandle?: string;
  onOpenDebateSummary?: (postId: string) => void;
}

export const DebateThreadDrawer: React.FC<DebateThreadDrawerProps> = ({
  isOpen,
  onClose,
  postId,
  targetCommentId,
  postTitle,
  postAuthorId,
  postAuthorName,
  postAuthorHandle,
  onOpenDebateSummary,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<PhilosophicalComment[]>([]);
  const [viewMode, setViewMode] = useState<"nested" | "split">("nested");
  const [isLoading, setIsLoading] = useState(false);

  // Top Comment Form State
  const [topCommentText, setTopCommentText] = useState("");
  const [topCommentStance, setTopCommentStance] = useState<"thesis" | "antithesis" | "synthesis">("thesis");

  // Inline Reply Form State
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStance, setReplyStance] = useState<"thesis" | "antithesis" | "synthesis">("antithesis");

  // Upvoted Comments & Collapsed Threads
  const [upvotedCommentIds, setUpvotedCommentIds] = useState<string[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

  const [activePostAuthor, setActivePostAuthor] = useState<{ id?: string; name?: string; handle?: string }>({});

  useEffect(() => {
    if (isOpen && postId) {
      setIsLoading(true);
      agoraClient
        .getComments(postId, true)
        .then((res) => setComments(res.comments))
        .catch((err) => console.error("Failed to load drawer comments:", err))
        .finally(() => setIsLoading(false));

      if (!postAuthorId && !postAuthorName) {
        agoraClient
          .getPosts()
          .then((res) => {
            const match = res.posts.find((p) => p.id === postId);
            if (match) {
              setActivePostAuthor({
                id: match.authorId,
                name: match.authorName,
                handle: match.authorHandle,
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, postId, postAuthorId, postAuthorName]);

  useEffect(() => {
    if (!postId) return;
    const handleCommentAdded = (e: Event) => {
      const customEvent = e as CustomEvent<{ entityId: string }>;
      if (customEvent.detail?.entityId === postId) {
        agoraClient
          .getComments(postId, true)
          .then((res) => setComments(res.comments))
          .catch(() => {});
      }
    };

    window.addEventListener("agora_comment_added", handleCommentAdded);
    return () => {
      window.removeEventListener("agora_comment_added", handleCommentAdded);
    };
  }, [postId]);

  useEffect(() => {
    if (isOpen && targetCommentId && comments.length > 0) {
      const byId = new Map(comments.map((comment) => [comment.id, comment]));
      const ancestors = new Set<string>();
      let parentId = byId.get(targetCommentId)?.parentId;
      while (parentId && !ancestors.has(parentId)) {
        ancestors.add(parentId);
        parentId = byId.get(parentId)?.parentId ?? null;
      }
      setCollapsedIds((prev) => prev.filter((id) => id !== targetCommentId && !ancestors.has(id)));
      const timer = setTimeout(() => {
        const el = document.getElementById(`comment-${targetCommentId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, targetCommentId, comments]);

  if (!isOpen || !postId) return null;

  const currentAuthorName = user?.name || user?.username || "Thinker";
  const currentAuthorHandle = user?.username || "thinker";
  const currentAuthorAvatar = user?.avatar || undefined;

  const handleCreateTopComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topCommentText.trim()) return;

    try {
      const created = await agoraClient.createComment(
        postId,
        topCommentText,
        null,
        topCommentStance,
        { authorName: currentAuthorName, authorHandle: currentAuthorHandle, authorAvatar: currentAuthorAvatar }
      );
      setComments((prev) => [created, ...prev]);
      setTopCommentText("");
    } catch (err) {
      console.error("Failed to post comment in drawer:", err);
    }
  };

  const handleCreateReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    try {
      const created = await agoraClient.createComment(
        postId,
        replyText,
        parentId,
        replyStance,
        { authorName: currentAuthorName, authorHandle: currentAuthorHandle, authorAvatar: currentAuthorAvatar }
      );
      setComments((prev) => [...prev, created]);
      setReplyText("");
      setReplyingToId(null);
    } catch (err) {
      console.error("Failed to post reply in drawer:", err);
    }
  };

  const handleUpvoteComment = async (commentId: string) => {
    const hasUpvoted = upvotedCommentIds.includes(commentId);
    setUpvotedCommentIds((prev) =>
      hasUpvoted ? prev.filter((id) => id !== commentId) : [...prev, commentId]
    );

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, upvotesCount: c.upvotesCount + (hasUpvoted ? -1 : 1) }
          : c
      )
    );

    try {
      await agoraClient.upvoteComment(commentId);
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Build recursive comment tree
  const buildCommentTree = (flatComments: PhilosophicalComment[]) => {
    const map = new Map<string, PhilosophicalComment & { replies: PhilosophicalComment[] }>();
    const roots: (PhilosophicalComment & { replies: PhilosophicalComment[] })[] = [];

    flatComments.forEach((c) => {
      map.set(c.id, { ...c, replies: [] });
    });

    flatComments.forEach((c) => {
      const node = map.get(c.id);
      if (!node) return;

      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const stanceBadge = (stance?: "thesis" | "antithesis" | "synthesis") => {
    switch (stance) {
      case "thesis":
        return <span className="stance-badge thesis">🟢 Thesis</span>;
      case "antithesis":
        return <span className="stance-badge antithesis">🔴 Antithesis</span>;
      case "synthesis":
      default:
        return <span className="stance-badge synthesis">⚪ Synthesis</span>;
    }
  };

  // Recursive Comment Item renderer
  const renderRecursiveCommentItem = (comment: PhilosophicalComment, depth = 0) => {
    const isCollapsed = collapsedIds.includes(comment.id);
    const isReplying = replyingToId === comment.id;
    const isUpvoted = upvotedCommentIds.includes(comment.id);
    const childReplies = comment.replies || [];

    const isCurrentUser = !!(
      user &&
      ((comment.authorId && (comment.authorId === user.id || comment.authorId === "usr-current")) ||
       (comment.authorHandle && user.username && comment.authorHandle.toLowerCase() === user.username.toLowerCase()) ||
       (comment.authorName && user.name && comment.authorName.toLowerCase() === user.name.toLowerCase()))
    );

    const effPostAuthorId = postAuthorId || activePostAuthor.id;
    const effPostAuthorName = postAuthorName || activePostAuthor.name;
    const effPostAuthorHandle = postAuthorHandle || activePostAuthor.handle;

    const isAuthor = !!(
      (effPostAuthorId && comment.authorId && (comment.authorId === effPostAuthorId || (effPostAuthorId === "usr-current" && comment.authorId === "usr-current"))) ||
      (effPostAuthorName && (
        (comment.authorName && comment.authorName.toLowerCase() === effPostAuthorName.toLowerCase()) ||
        (comment.authorHandle && comment.authorHandle.toLowerCase() === effPostAuthorName.toLowerCase())
      )) ||
      (effPostAuthorHandle && comment.authorHandle && comment.authorHandle.toLowerCase() === effPostAuthorHandle.toLowerCase()) ||
      (isCurrentUser && user && (
        (effPostAuthorId && (user.id === effPostAuthorId || effPostAuthorId === "usr-current")) ||
        (effPostAuthorName && user.name && user.name.toLowerCase() === effPostAuthorName.toLowerCase()) ||
        (effPostAuthorHandle && user.username && user.username.toLowerCase() === effPostAuthorHandle.toLowerCase())
      ))
    );

    const displayName = isCurrentUser
      ? (comment.authorName || user?.name || user?.username || "You")
      : comment.authorName || (comment.authorHandle ? `@${comment.authorHandle}` : "Thinker");

    const isTargeted = targetCommentId === comment.id;

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={`comment-thread-node stance-${comment.stance || "synthesis"} ${isTargeted ? "highlighted-reply-node" : ""}`}
        style={{
          marginLeft: depth > 0 ? `${Math.min(depth * 20, 80)}px` : 0,
          borderLeft: depth > 0 ? "2px solid rgba(255, 255, 255, 0.08)" : "none",
          paddingLeft: depth > 0 ? "10px" : 0,
          marginTop: depth > 0 ? "10px" : "12px",
        }}
      >
        <div className={`youtube-comment-card ${isTargeted ? "highlighted-reply-comment" : ""}`} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "6px 0" }}>
          {/* Avatar Column */}
          {comment.authorAvatar ? (
            <img src={comment.authorAvatar} alt="Avatar" className="author-avatar-img-sm" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div className="author-avatar-circle-sm" style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", color: "#ffffff" }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Body Column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* YouTube / TikTok Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
              <span
                className="author-name-text"
                style={{
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  color: isAuthor ? "#38bdf8" : "#f8fafc",
                  background: isAuthor ? "rgba(56, 189, 248, 0.12)" : "transparent",
                  padding: isAuthor ? "1px 6px" : 0,
                  borderRadius: isAuthor ? 6 : 0,
                }}
              >
                {displayName} {isCurrentUser && displayName !== "You" ? <span style={{ color: "#38bdf8", fontWeight: 600, fontSize: "0.78rem" }}>(You)</span> : null}
              </span>

              {isAuthor ? (
                <span
                  className="author-badge-chip"
                  style={{
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    color: "#ffffff",
                    borderRadius: "12px",
                    padding: "2px 9px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.4)",
                    border: "1px solid rgba(56, 189, 248, 0.5)",
                    letterSpacing: "0.03em",
                  }}
                >
                  👑 Original Author
                </span>
              ) : isCurrentUser ? (
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#e2e8f0",
                    borderRadius: "10px",
                    padding: "1px 6px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                  }}
                >
                  You
                </span>
              ) : null}

              {comment.authorHandle && (
                <span className="author-handle-text" style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  @{comment.authorHandle}
                </span>
              )}

              <span className="comment-timestamp" style={{ fontSize: "0.75rem", color: "#64748b" }}>
                • {comment.createdAt}
              </span>

              <span style={{ marginLeft: "auto" }}>
                {stanceBadge(comment.stance)}
              </span>
            </div>

            {/* Comment Text */}
            <p className="comment-content-body" style={{ margin: "4px 0 6px 0", fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.45 }}>
              {comment.content}
            </p>

            {/* Action Bar */}
            <div className="comment-actions-bar" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                type="button"
                className={`upvote-btn-sm ${isUpvoted ? "active" : ""}`}
                style={{ background: isUpvoted ? "rgba(59, 130, 246, 0.2)" : "none", border: "none", color: isUpvoted ? "#60a5fa" : "#94a3b8", fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "2px 6px", borderRadius: 6 }}
                onClick={() => handleUpvoteComment(comment.id)}
              >
                👍 {comment.upvotesCount}
              </button>

              <button
                type="button"
                className="reply-action-btn"
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "2px 6px" }}
                onClick={() => {
                  if (isReplying) {
                    setReplyingToId(null);
                  } else {
                    setReplyingToId(comment.id);
                    setReplyStance(
                      comment.stance === "thesis"
                        ? "antithesis"
                        : comment.stance === "antithesis"
                        ? "synthesis"
                        : "thesis"
                    );
                  }
                }}
              >
                💬 {isReplying ? "Cancel Reply" : "Reply"}
              </button>

              {childReplies.length > 0 && (
                <button
                  type="button"
                  className="collapse-thread-btn"
                  style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", padding: "2px 6px" }}
                  onClick={() => toggleCollapse(comment.id)}
                >
                  {isCollapsed ? `▼ ${childReplies.length} replies` : `▲ Hide replies`}
                </button>
              )}
            </div>

          {/* Nested Reply Input */}
          {isReplying && (
            <div className="inline-reply-box">
              <div className="stance-selector-row">
                <span className="selector-label">Reply Stance:</span>
                <button
                  type="button"
                  className={`stance-btn thesis ${replyStance === "thesis" ? "selected" : ""}`}
                  onClick={() => setReplyStance("thesis")}
                >
                  🟢 Thesis
                </button>
                <button
                  type="button"
                  className={`stance-btn antithesis ${replyStance === "antithesis" ? "selected" : ""}`}
                  onClick={() => setReplyStance("antithesis")}
                >
                  🔴 Antithesis
                </button>
                <button
                  type="button"
                  className={`stance-btn synthesis ${replyStance === "synthesis" ? "selected" : ""}`}
                  onClick={() => setReplyStance("synthesis")}
                >
                  ⚪ Synthesis
                </button>
              </div>

              <textarea
                className="input-textarea reply-textarea"
                rows={2}
                placeholder={`Replying to @${comment.authorHandle}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />

              <div className="reply-submit-row">
                <button
                  type="button"
                  className="connect-btn"
                  onClick={() => handleCreateReply(comment.id)}
                >
                  Publish Reply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recursive Sub-Threads */}
      {!isCollapsed && childReplies.length > 0 && (
        <div className="nested-replies-container">
          {childReplies.map((child) => renderRecursiveCommentItem(child, depth + 1))}
        </div>
      )}
    </div>
  );
};

  const commentRoots = buildCommentTree(comments);
  const thesisComments = comments.filter((c) => c.stance === "thesis");
  const antithesisComments = comments.filter((c) => c.stance === "antithesis");
  const synthesisComments = comments.filter((c) => !c.stance || c.stance === "synthesis");

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content-pane debate-thread-drawer-pane" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <h3>💬 Live Philosophical Debate Tree</h3>
            <p className="drawer-subtitle">
              {postTitle ? `Debating: "${postTitle}"` : "Interactive Comment Tree & Split View"}
            </p>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="drawer-toolbar-bar">
          <div className="view-mode-toggle-group">
            <button
              type="button"
              className={`toggle-mode-btn ${viewMode === "nested" ? "active" : ""}`}
              onClick={() => setViewMode("nested")}
            >
              🌳 Nested Tree View
            </button>
            <button
              type="button"
              className={`toggle-mode-btn ${viewMode === "split" ? "active" : ""}`}
              onClick={() => setViewMode("split")}
            >
              ⚔️ Side-by-Side Split View
            </button>
          </div>

          {/* Launch DebateSummaryDrawer directly from thread drawer */}
          {onOpenDebateSummary && (
            <button
              type="button"
              className="ai-summary-trigger-btn"
              onClick={() => {
                onClose();
                onOpenDebateSummary(postId);
              }}
            >
              🧠 Launch AI Debate Summary
            </button>
          )}
        </div>

        {/* Drawer Content Body */}
        <div className="drawer-body">
          {/* Top Level Comment Creation Box */}
          <form className="top-comment-form" onSubmit={handleCreateTopComment}>
            <div className="stance-selector-row">
              <span className="selector-label">Stance:</span>
              <button
                type="button"
                className={`stance-btn thesis ${topCommentStance === "thesis" ? "selected" : ""}`}
                onClick={() => setTopCommentStance("thesis")}
              >
                🟢 Thesis
              </button>
              <button
                type="button"
                className={`stance-btn antithesis ${topCommentStance === "antithesis" ? "selected" : ""}`}
                onClick={() => setTopCommentStance("antithesis")}
              >
                🔴 Antithesis
              </button>
              <button
                type="button"
                className={`stance-btn synthesis ${topCommentStance === "synthesis" ? "selected" : ""}`}
                onClick={() => setTopCommentStance("synthesis")}
              >
                ⚪ Synthesis
              </button>
            </div>

            <textarea
              className="input-textarea"
              rows={2}
              placeholder="Contribute your philosophical argument or rebuttal..."
              value={topCommentText}
              onChange={(e) => setTopCommentText(e.target.value)}
            />

            <div className="form-submit-row">
              <button type="submit" className="connect-btn">
                Post {topCommentStance.toUpperCase()}
              </button>
            </div>
          </form>

          {/* Comments Content: Nested Mode vs Split View Mode */}
          {isLoading ? (
            <div className="loading-state">Loading debate threads...</div>
          ) : comments.length === 0 ? (
            <div className="empty-state">No comments yet. Be the first to start the debate!</div>
          ) : viewMode === "nested" ? (
            /* NESTED TREE VIEW */
            <div className="nested-tree-view">
              {commentRoots.map((root) => renderRecursiveCommentItem(root, 0))}
            </div>
          ) : (
            /* SIDE-BY-SIDE THESIS VS ANTITHESIS SPLIT VIEW */
            <div className="split-view-container">
              <div className="split-columns-wrapper">
                {/* Thesis Column */}
                <div className="split-column thesis-col">
                  <div className="split-col-header thesis-header">
                    <h4>🟢 Thesis / Proponents</h4>
                    <span className="col-count-chip">{thesisComments.length}</span>
                  </div>
                  <div className="split-comments-list">
                    {thesisComments.length === 0 ? (
                      <div className="empty-column-text">No thesis arguments.</div>
                    ) : (
                      thesisComments.map((c) => (
                        <div key={c.id} className="split-comment-card thesis-card">
                          <div className="comment-header-row">
                            <span className="author-name-text">{c.authorName}</span>
                            <span className="comment-timestamp">{c.createdAt}</span>
                          </div>
                          <p className="comment-content-body">{c.content}</p>
                          <div className="comment-actions-bar">
                            <button
                              type="button"
                              className="upvote-btn-sm"
                              onClick={() => handleUpvoteComment(c.id)}
                            >
                              ▲ {c.upvotesCount}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Antithesis Column */}
                <div className="split-column antithesis-col">
                  <div className="split-col-header antithesis-header">
                    <h4>🔴 Antithesis / Rebuttals</h4>
                    <span className="col-count-chip">{antithesisComments.length}</span>
                  </div>
                  <div className="split-comments-list">
                    {antithesisComments.length === 0 ? (
                      <div className="empty-column-text">No antithesis rebuttals.</div>
                    ) : (
                      antithesisComments.map((c) => (
                        <div key={c.id} className="split-comment-card antithesis-card">
                          <div className="comment-header-row">
                            <span className="author-name-text">{c.authorName}</span>
                            <span className="comment-timestamp">{c.createdAt}</span>
                          </div>
                          <p className="comment-content-body">{c.content}</p>
                          <div className="comment-actions-bar">
                            <button
                              type="button"
                              className="upvote-btn-sm"
                              onClick={() => handleUpvoteComment(c.id)}
                            >
                              ▲ {c.upvotesCount}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Synthesis Panel */}
              <div className="synthesis-panel">
                <div className="split-col-header synthesis-header">
                  <h4>⚪ Synthesis & Neutral Integrations</h4>
                  <span className="col-count-chip">{synthesisComments.length}</span>
                </div>
                <div className="synthesis-grid">
                  {synthesisComments.length === 0 ? (
                    <div className="empty-column-text">No synthesis contributions.</div>
                  ) : (
                    synthesisComments.map((c) => (
                      <div key={c.id} className="split-comment-card synthesis-card">
                        <div className="comment-header-row">
                          <span className="author-name-text">{c.authorName}</span>
                          <span className="comment-timestamp">{c.createdAt}</span>
                        </div>
                        <p className="comment-content-body">{c.content}</p>
                        <div className="comment-actions-bar">
                          <button
                            type="button"
                            className="upvote-btn-sm"
                            onClick={() => handleUpvoteComment(c.id)}
                          >
                            ▲ {c.upvotesCount}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
