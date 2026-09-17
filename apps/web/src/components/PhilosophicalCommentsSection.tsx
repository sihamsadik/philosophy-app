import React, { useState, useEffect } from "react";
import type { PhilosophicalComment } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";
import { useAuth } from "../context/AuthContext.js";

export interface PhilosophicalCommentsSectionProps {
  entityId: string;
  postAuthorId?: string;
  postAuthorName?: string;
  postAuthorHandle?: string;
  onOpenDebateSummary?: (entityId: string) => void;
}

export const PhilosophicalCommentsSection: React.FC<PhilosophicalCommentsSectionProps> = ({
  entityId,
  postAuthorId,
  postAuthorName,
  postAuthorHandle,
  onOpenDebateSummary,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<PhilosophicalComment[]>([]);
  const [viewMode, setViewMode] = useState<"nested" | "split">("nested");
  const [isLoading, setIsLoading] = useState(true);

  // New Comment Form State
  const [topCommentText, setTopCommentText] = useState("");
  const [topCommentStance, setTopCommentStance] = useState<"thesis" | "antithesis" | "synthesis">("thesis");
  
  // Reply Form State
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStance, setReplyStance] = useState<"thesis" | "antithesis" | "synthesis">("antithesis");

  // Thread Collapse State
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const [upvotedCommentIds, setUpvotedCommentIds] = useState<string[]>([]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const res = await agoraClient.getComments(entityId);
      setComments(res.comments);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      fetchComments();
    }
  }, [entityId]);

  const handleCreateTopComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topCommentText.trim()) return;

    const authorName = user?.name || user?.username || "You";
    const authorHandle = user?.username || "you";
    const authorAvatar = user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

    try {
      const created = await agoraClient.createComment(entityId, topCommentText, null, topCommentStance, {
        authorName,
        authorHandle,
        authorAvatar,
      });
      setComments((prev) => [created, ...prev]);
      setTopCommentText("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const handleCreateReply = async (parentId: string, defaultStance?: "thesis" | "antithesis" | "synthesis") => {
    if (!replyText.trim()) return;

    const authorName = user?.name || user?.username || "You";
    const authorHandle = user?.username || "you";
    const authorAvatar = user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

    try {
      const created = await agoraClient.createComment(
        entityId,
        replyText,
        parentId,
        replyStance || defaultStance || "synthesis",
        {
          authorName,
          authorHandle,
          authorAvatar,
        }
      );
      setComments((prev) => [...prev, created]);
      setReplyText("");
      setReplyingToId(null);
    } catch (err) {
      console.error("Failed to post reply:", err);
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

  // Organize comments into a tree for nested mode
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

  const renderNestedCommentNode = (
    comment: PhilosophicalComment,
    depth = 0
  ) => {
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

    const isAuthor = !!(
      (postAuthorId && comment.authorId && comment.authorId === postAuthorId) ||
      (postAuthorName && (
        (comment.authorName && comment.authorName.toLowerCase() === postAuthorName.toLowerCase()) ||
        (comment.authorHandle && comment.authorHandle.toLowerCase() === postAuthorName.toLowerCase())
      )) ||
      (postAuthorHandle && comment.authorHandle && comment.authorHandle.toLowerCase() === postAuthorHandle.toLowerCase())
    );

    const displayName = isCurrentUser
      ? "You"
      : comment.authorName || (comment.authorHandle ? `@${comment.authorHandle}` : "Anonymous Thinker");

    return (
      <div
        key={comment.id}
        className={`comment-thread-node stance-${comment.stance || "synthesis"}`}
        style={{
          marginLeft: depth > 0 ? `${Math.min(depth * 24, 96)}px` : 0,
          borderLeft: depth > 0 ? "2px solid rgba(255, 255, 255, 0.08)" : "none",
          paddingLeft: depth > 0 ? "12px" : 0,
          marginTop: depth > 0 ? "10px" : "14px",
        }}
      >
        <div className="youtube-comment-card" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "6px 0" }}>
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
            {/* YouTube / LinkedIn Header */}
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
                {displayName}
              </span>

              {isAuthor ? (
                <span
                  className="author-badge-chip"
                  style={{
                    background: "#38bdf8",
                    color: "#0f172a",
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    boxShadow: "0 2px 6px rgba(56, 189, 248, 0.3)",
                  }}
                >
                  👑 Author
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

            {/* Comment Text Content */}
            <p className="comment-content-body" style={{ margin: "4px 0 6px 0", fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.45 }}>
              {comment.content}
            </p>

            {/* YouTube Action Bar */}
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

          {/* Inline Reply Form */}
          {isReplying && (
            <div className="inline-reply-box">
              <div className="stance-selector-row">
                <span className="selector-label">Stance of your reply:</span>
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
                placeholder={`Replying to @${comment.authorHandle} with a ${replyStance} perspective...`}
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

      {/* Recursive Child Replies */}
      {!isCollapsed && childReplies.length > 0 && (
        <div className="nested-replies-container">
          {childReplies.map((child) => renderNestedCommentNode(child, depth + 1))}
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
    <div className="philosophical-comments-container">
      {/* Header & Controls Bar */}
      <div className="comments-header-bar">
        <div className="comments-title-block">
          <h3>💬 Philosophical Debate & Discussion Tree</h3>
          <span className="comments-count-pill">{comments.length} Contributions</span>
        </div>

        <div className="comments-actions-group">
          {/* View Mode Toggle */}
          <div className="view-mode-toggle-group">
            <button
              type="button"
              className={`toggle-mode-btn ${viewMode === "nested" ? "active" : ""}`}
              onClick={() => setViewMode("nested")}
            >
              🌳 Nested Thread Tree
            </button>
            <button
              type="button"
              className={`toggle-mode-btn ${viewMode === "split" ? "active" : ""}`}
              onClick={() => setViewMode("split")}
            >
              ⚔️ Thesis vs. Antithesis Split View
            </button>
          </div>

          {/* AI Debate Summary Trigger */}
          {onOpenDebateSummary && (
            <button
              type="button"
              className="ai-summary-trigger-btn"
              onClick={() => onOpenDebateSummary(entityId)}
            >
              🧠 AI Debate Analysis & Summary
            </button>
          )}
        </div>
      </div>

      {/* Top Level Comment Creation Box */}
      <form className="top-comment-form" onSubmit={handleCreateTopComment}>
        <div className="stance-selector-row">
          <span className="selector-label">Your Philosophical Stance:</span>
          <button
            type="button"
            className={`stance-btn thesis ${topCommentStance === "thesis" ? "selected" : ""}`}
            onClick={() => setTopCommentStance("thesis")}
          >
            🟢 Thesis (Proponent)
          </button>
          <button
            type="button"
            className={`stance-btn antithesis ${topCommentStance === "antithesis" ? "selected" : ""}`}
            onClick={() => setTopCommentStance("antithesis")}
          >
            🔴 Antithesis (Rebuttal)
          </button>
          <button
            type="button"
            className={`stance-btn synthesis ${topCommentStance === "synthesis" ? "selected" : ""}`}
            onClick={() => setTopCommentStance("synthesis")}
          >
            ⚪ Synthesis (Neutral / Integration)
          </button>
        </div>

        <textarea
          className="input-textarea"
          rows={3}
          placeholder="Contribute your philosophical argument, counter-argument, or synthesis..."
          value={topCommentText}
          onChange={(e) => setTopCommentText(e.target.value)}
        />

        <div className="form-submit-row">
          <button type="submit" className="connect-btn">
            💬 Post {topCommentStance.toUpperCase()} Contribution
          </button>
        </div>
      </form>

      {/* Main Content Area: Nested Mode vs Split View Mode */}
      {isLoading ? (
        <div className="loading-state">Loading debate threads...</div>
      ) : comments.length === 0 ? (
        <div className="empty-state">No comments yet. Be the first to start the debate!</div>
      ) : viewMode === "nested" ? (
        /* NESTED THREAD TREE VIEW */
        <div className="nested-tree-view">
          {commentRoots.map((root) => renderNestedCommentNode(root, 0))}
        </div>
      ) : (
        /* THESIS VS ANTITHESIS DUAL-COLUMN SPLIT VIEW */
        <div className="split-view-container">
          <div className="split-columns-wrapper">
            {/* Left Column: Thesis */}
            <div className="split-column thesis-col">
              <div className="split-col-header thesis-header">
                <h4>🟢 Thesis / Proponents</h4>
                <span className="col-count-chip">{thesisComments.length}</span>
              </div>
              <div className="split-comments-list">
                {thesisComments.length === 0 ? (
                  <div className="empty-column-text">No thesis arguments posted yet.</div>
                ) : (
                  thesisComments.map((comment) => (
                    <div key={comment.id} className="split-comment-card thesis-card">
                      <div className="comment-header-row">
                        <span className="author-name-text">{comment.authorName}</span>
                        <span className="comment-timestamp">{comment.createdAt}</span>
                      </div>
                      <p className="comment-content-body">{comment.content}</p>
                      <div className="comment-actions-bar">
                        <button
                          type="button"
                          className="upvote-btn-sm"
                          onClick={() => handleUpvoteComment(comment.id)}
                        >
                          ▲ {comment.upvotesCount}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Antithesis */}
            <div className="split-column antithesis-col">
              <div className="split-col-header antithesis-header">
                <h4>🔴 Antithesis / Rebuttals</h4>
                <span className="col-count-chip">{antithesisComments.length}</span>
              </div>
              <div className="split-comments-list">
                {antithesisComments.length === 0 ? (
                  <div className="empty-column-text">No antithesis rebuttals posted yet.</div>
                ) : (
                  antithesisComments.map((comment) => (
                    <div key={comment.id} className="split-comment-card antithesis-card">
                      <div className="comment-header-row">
                        <span className="author-name-text">{comment.authorName}</span>
                        <span className="comment-timestamp">{comment.createdAt}</span>
                      </div>
                      <p className="comment-content-body">{comment.content}</p>
                      <div className="comment-actions-bar">
                        <button
                          type="button"
                          className="upvote-btn-sm"
                          onClick={() => handleUpvoteComment(comment.id)}
                        >
                          ▲ {comment.upvotesCount}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Panel: Synthesis */}
          <div className="synthesis-panel">
            <div className="split-col-header synthesis-header">
              <h4>⚪ Synthesis & Neutral Integrations</h4>
              <span className="col-count-chip">{synthesisComments.length}</span>
            </div>
            <div className="synthesis-grid">
              {synthesisComments.length === 0 ? (
                <div className="empty-column-text">No synthesis contributions posted yet.</div>
              ) : (
                synthesisComments.map((comment) => (
                  <div key={comment.id} className="split-comment-card synthesis-card">
                    <div className="comment-header-row">
                      <span className="author-name-text">{comment.authorName}</span>
                      <span className="comment-timestamp">{comment.createdAt}</span>
                    </div>
                    <p className="comment-content-body">{comment.content}</p>
                    <div className="comment-actions-bar">
                      <button
                        type="button"
                        className="upvote-btn-sm"
                        onClick={() => handleUpvoteComment(comment.id)}
                      >
                        ▲ {comment.upvotesCount}
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
  );
};
