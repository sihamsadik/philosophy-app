import React, { useState, useEffect } from "react";
import type { PhilosophicalComment } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";

export interface PhilosophicalCommentsSectionProps {
  entityId: string;
  onOpenDebateSummary?: (entityId: string) => void;
}

export const PhilosophicalCommentsSection: React.FC<PhilosophicalCommentsSectionProps> = ({
  entityId,
  onOpenDebateSummary,
}) => {
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

    try {
      const created = await agoraClient.createComment(entityId, topCommentText, null, topCommentStance);
      setComments((prev) => [created, ...prev]);
      setTopCommentText("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const handleCreateReply = async (parentId: string, defaultStance?: "thesis" | "antithesis" | "synthesis") => {
    if (!replyText.trim()) return;

    try {
      const created = await agoraClient.createComment(
        entityId,
        replyText,
        parentId,
        replyStance || defaultStance || "synthesis"
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
        return <span className="stance-badge thesis">🟢 Thesis / Proponent</span>;
      case "antithesis":
        return <span className="stance-badge antithesis">🔴 Antithesis / Rebuttal</span>;
      case "synthesis":
      default:
        return <span className="stance-badge synthesis">⚪ Synthesis / Integration</span>;
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

    return (
      <div
        key={comment.id}
        className={`comment-thread-node stance-${comment.stance || "synthesis"}`}
        style={{ marginLeft: depth > 0 ? `${Math.min(depth * 20, 80)}px` : 0 }}
      >
        <div className="comment-card">
          <div className="comment-header-row">
            <div className="author-identity">
              {comment.authorAvatar ? (
                <img src={comment.authorAvatar} alt="Avatar" className="author-avatar-img-sm" />
              ) : (
                <div className="author-avatar-circle-sm">
                  {comment.authorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="author-text-info">
                <span className="author-name-text">{comment.authorName}</span>
                <span className="author-handle-text">@{comment.authorHandle}</span>
              </div>
            </div>

            <div className="comment-meta-right">
              {stanceBadge(comment.stance)}
              <span className="comment-timestamp">{comment.createdAt}</span>
            </div>
          </div>

          <p className="comment-content-body">{comment.content}</p>

          <div className="comment-actions-bar">
            <button
              type="button"
              className={`upvote-btn-sm ${isUpvoted ? "active" : ""}`}
              onClick={() => handleUpvoteComment(comment.id)}
            >
              ▲ {comment.upvotesCount}
            </button>

            <button
              type="button"
              className="reply-action-btn"
              onClick={() => {
                if (isReplying) {
                  setReplyingToId(null);
                } else {
                  setReplyingToId(comment.id);
                  // Default reply stance counter to parent stance
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
                onClick={() => toggleCollapse(comment.id)}
              >
                {isCollapsed ? `▶ Expand (${childReplies.length} replies)` : `▼ Collapse`}
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
