import React, { useState, useEffect } from "react";
import type { User } from "@agora-server/contract";
import type { PhilosophicalPost } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";
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

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const { posts: list } = await agoraClient.getPosts();
        setPosts(list);
        // Expand comments by default for the first post so user immediately sees live debate tree
        if (list.length > 0 && list[0]?.id) {
          setExpandedCommentsPostIds([list[0].id]);
        }
      } catch (err) {
        console.error("Failed to load posts:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const handleUpvote = (postId: string) => {
    const hasUpvoted = upvotedPostIds.includes(postId);
    setUpvotedPostIds(
      hasUpvoted ? upvotedPostIds.filter((id) => id !== postId) : [...upvotedPostIds, postId]
    );

    setPosts((prev) =>
      prev.map((p) =>
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

  const filteredPosts =
    filterType === "all" ? posts : posts.filter((p) => p.postType === filterType);

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
      ) : filteredPosts.length === 0 ? (
        <div className="empty-state">No posts found for selected filter.</div>
      ) : (
        <div className="posts-list-grid">
          {filteredPosts.map((post) => {
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
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="author-name-text">{post.authorName}</span>
                      <span className="author-handle-text">@{post.authorHandle}</span>
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
                    {post.keyThinkers.map((thinker, i) => (
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
                      🧠 AI Debate Summary
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
