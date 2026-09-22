import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient, type PhilosophicalPost } from "../lib/api-client.js";
import { PhilosophicalCommentsSection } from "./PhilosophicalCommentsSection.js";

export interface PhilosophicalFeedProps {
  onOpenDebateSummary: (postId: string) => void;
  onOpenDM: (authorUser: User) => void;
  onOpenComposer: () => void;
  onOpenThreadDrawer?: (postId: string) => void;
}

export const PhilosophicalFeed: React.FC<PhilosophicalFeedProps> = ({
  onOpenDebateSummary,
  onOpenDM,
  onOpenComposer,
  onOpenThreadDrawer,
}) => {
  const [posts, setPosts] = useState<PhilosophicalPost[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [upvotedPostIds, setUpvotedPostIds] = useState<string[]>([]);
  const [expandedCommentsPostIds, setExpandedCommentsPostIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await agoraClient.getPosts();
      const rawList = res?.posts || (res as any)?.data || [];
      const list = Array.isArray(rawList) ? rawList : [];
      setPosts(list);
      if (list.length > 0 && list[0]?.id) {
        setExpandedCommentsPostIds([list[0].id]);
      }
    } catch (err: any) {
      console.error("Failed to load posts:", err);
      setError(err.message || "Could not connect to database/backend service.");
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    const handleCommentAdded = (e: Event) => {
      const customEvent = e as CustomEvent<{ entityId: string }>;
      const targetId = customEvent.detail?.entityId;
      if (targetId) {
        setPosts((prev) =>
          (Array.isArray(prev) ? prev : []).map((p) =>
            p.id === targetId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
          )
        );
      }
    };

    window.addEventListener("agora_comment_added", handleCommentAdded);
    return () => {
      window.removeEventListener("agora_comment_added", handleCommentAdded);
    };
  }, []);

  const handleUpvote = (postId: string) => {
    const hasUpvoted = upvotedPostIds.includes(postId);
    setUpvotedPostIds(
      hasUpvoted ? upvotedPostIds.filter((id) => id !== postId) : [...upvotedPostIds, postId]
    );

    setPosts((prev) =>
      (Array.isArray(prev) ? prev : []).map((p) =>
        p.id === postId
          ? { ...p, upvotesCount: p.upvotesCount + (hasUpvoted ? -1 : 1) }
          : p
      )
    );
  };

  const toggleCommentsSection = (postId: string) => {
    setExpandedCommentsPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const safePosts = Array.isArray(posts) ? posts : [];
  const filteredPosts =
    filterType === "all" ? safePosts : safePosts.filter((p) => p && p.postType === filterType);

  return (
    <div className="feed-container">
      {/* Header & Composer Trigger */}
      <div className="feed-header">
        <div>
          <h2>📜 Philosophical Debates & Post Feed</h2>
          <p className="feed-subtitle">
            Read, analyze, and publish community arguments, theses, and thought experiments.
          </p>
        </div>
        <button type="button" className="connect-btn" onClick={onOpenComposer}>
          ✍️ Publish New Post
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar">
        <span className="filter-label">Filter:</span>
        {["all", "argument", "thought_experiment", "question", "thesis", "essay"].map((type) => (
          <button
            key={type}
            type="button"
            className={`filter-btn ${filterType === type ? "active" : ""}`}
            onClick={() => setFilterType(type)}
          >
            {type === "all"
              ? "All Posts"
              : type.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="loading-state">Loading posts feed...</div>
      ) : error ? (
        <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: 20, margin: "16px 0", color: "#f87171", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: "1.05rem", display: "block", marginBottom: 4 }}>⚠️ Database / Backend Connection Error</strong>
            <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>{error}. Unable to load live debates from database.</span>
          </div>
          <button type="button" onClick={fetchPosts} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            🔄 Retry
          </button>
        </div>
      ) : !filteredPosts || filteredPosts.length === 0 ? (
        <div className="empty-state" style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", margin: "16px 0" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📜</div>
          <h3 style={{ fontSize: "1.25rem", margin: "8px 0" }}>No Active Philosophical Debates</h3>
          <p style={{ color: "#94a3b8", maxWidth: 450, margin: "0 auto 16px auto" }}>
            {filterType !== "all" ? `No posts matched filter "${filterType}".` : "There are no debate posts available in the local database right now. Publish the first one!"}
          </p>
          <button type="button" className="connect-btn" onClick={onOpenComposer}>
            ✍️ Publish First Post
          </button>
        </div>
      ) : (
        <div className="posts-list-grid">
          {(filteredPosts || []).map((post) => {
            const isUpvoted = upvotedPostIds.includes(post.id);
            const isCommentsExpanded = expandedCommentsPostIds.includes(post.id);

            return (
              <div key={post.id} className="search-result-card post-feed-card">
                {/* Author Bar */}
                <div className="post-author-row">
                  <div className="author-identity">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt="Avatar" className="author-avatar-img" />
                    ) : (
                      <div className="author-avatar-circle">
                        {(post.authorName || post.authorHandle || "T").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="author-name-text">{post.authorName || post.authorHandle || "Thinker"}</span>
                      <span className="author-handle-text">@{post.authorHandle || "thinker"}</span>
                    </div>
                  </div>

                  <div className="post-tags-row">
                    <span className="result-type-tag argument">
                      {post.postType.toUpperCase().replace("_", " ")}
                    </span>
                    {post.primarySchool && (
                      <span className="chip school-chip">{post.primarySchool}</span>
                    )}
                  </div>
                </div>

                {/* Post Title & Content */}
                <h3 className="result-title" style={{ marginTop: 12, fontSize: "1.25rem" }}>
                  {post.title}
                </h3>
                <p className="result-snippet" style={{ margin: "10px 0 16px 0", lineHeight: 1.5 }}>
                  {post.content}
                </p>

                {/* Key Thinkers Pills */}
                {post.keyThinkers && post.keyThinkers.length > 0 && (
                  <div className="thinkers-pills-row" style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Key Thinkers:
                    </span>
                    {(post as any).keyThinkers.map((thinker: string, i: number) => (
                      <span key={i} className="chip thinker-chip">
                        🧠 {thinker}
                      </span>
                    ))}
                  </div>
                )}

                {/* Post Footer & Actions */}
                <div className="card-actions" style={{ justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={`upvote-btn ${isUpvoted ? "active" : ""}`}
                      onClick={() => handleUpvote(post.id)}
                    >
                      ▲ {post.upvotesCount}
                    </button>

                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => {
                        if (onOpenThreadDrawer) {
                          onOpenThreadDrawer(post.id);
                        } else {
                          toggleCommentsSection(post.id);
                        }
                      }}
                    >
                      💬 Comments & Debate Tree ({post.commentsCount})
                    </button>

                    <button
                      type="button"
                      className="ai-summary-trigger-btn"
                      onClick={() => onOpenDebateSummary(post.id)}
                    >
                      ⚡ Debate Overview
                    </button>
                  </div>

                  <button
                    type="button"
                    className="connect-btn"
                    style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                    onClick={() =>
                      onOpenDM({
                        id: post.authorId,
                        name: post.authorName,
                        username: post.authorHandle,
                        avatar: post.authorAvatar,
                      } as User)
                    }
                  >
                    💬 Direct Message Author
                  </button>
                </div>

                {/* Embedded Philosophical Comments & Live Debate Tree */}
                {isCommentsExpanded && (
                  <PhilosophicalCommentsSection
                    entityId={post.id}
                    postAuthorId={post.authorId}
                    postAuthorName={post.authorName}
                    postAuthorHandle={post.authorHandle}
                    onOpenDebateSummary={onOpenDebateSummary}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
