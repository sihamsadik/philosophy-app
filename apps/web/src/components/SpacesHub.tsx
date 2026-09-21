import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient, type PhilosophicalSpace, type PhilosophicalPost } from "../lib/api-client.js";
import { PhilosophicalCommentsSection } from "./PhilosophicalCommentsSection.js";

export interface SpacesHubProps {
  onOpenDM?: (user: User) => void;
  onOpenDebateSummary?: (postId: string) => void;
  onOpenComposerForSpace?: (space: PhilosophicalSpace) => void;
}

export const SpacesHub: React.FC<SpacesHubProps> = ({
  onOpenDM,
  onOpenDebateSummary,
  onOpenComposerForSpace,
}) => {
  const [spaces, setSpaces] = useState<PhilosophicalSpace[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedSpace, setSelectedSpace] = useState<PhilosophicalSpace | null>(null);
  const [spacePosts, setSpacePosts] = useState<PhilosophicalPost[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [upvotedPostIds, setUpvotedPostIds] = useState<string[]>([]);
  const [expandedCommentsPostIds, setExpandedCommentsPostIds] = useState<string[]>([]);

  // Active view tab inside detailed space view
  const [spaceViewTab, setSpaceViewTab] = useState<"feed" | "roster">("feed");
  const [error, setError] = useState<string | null>(null);

  const fetchSpaces = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { spaces: list } = await agoraClient.getSpaces(
        activeCategory === "all" ? undefined : activeCategory
      );
      setSpaces(list);
    } catch (err: any) {
      console.error("Failed to load spaces:", err);
      setError(err.message || "Unable to fetch spaces from database");
      setSpaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, [activeCategory]);

  // Load posts for selected space
  useEffect(() => {
    if (!selectedSpace) return;
    const fetchSpacePosts = async () => {
      setIsPostsLoading(true);
      try {
        const { posts: allPosts } = await agoraClient.getPosts();
        // Filter posts matching space primary school or spaceId
        const matched = allPosts.filter(
          (p) =>
            p.spaceId === selectedSpace.id ||
            p.primarySchool?.toLowerCase().includes(selectedSpace.primarySchool?.toLowerCase() || "")
        );
        setSpacePosts(matched.length > 0 ? matched : allPosts);
      } catch (err) {
        console.error("Failed to load space posts:", err);
      } finally {
        setIsPostsLoading(false);
      }
    };
    fetchSpacePosts();
  }, [selectedSpace]);

  const handleJoinToggle = async (space: PhilosophicalSpace, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (space.isJoined) {
        const res = await agoraClient.leaveSpace(space.id);
        setSpaces((prev) => prev.map((s) => (s.id === space.id ? res.space : s)));
        if (selectedSpace?.id === space.id) {
          setSelectedSpace(res.space);
        }
      } else {
        const res = await agoraClient.joinSpace(space.id);
        setSpaces((prev) => prev.map((s) => (s.id === space.id ? res.space : s)));
        if (selectedSpace?.id === space.id) {
          setSelectedSpace(res.space);
        }
      }
    } catch (err) {
      console.error("Join/Leave space failed:", err);
    }
  };

  const handleSeedSpaces = async () => {
    try {
      await agoraClient.seedPhilosophySpaces();
      await fetchSpaces();
    } catch (err) {
      console.error("Failed to seed spaces:", err);
    }
  };

  const handleUpvotePost = (postId: string) => {
    const hasUpvoted = upvotedPostIds.includes(postId);
    setUpvotedPostIds(
      hasUpvoted ? upvotedPostIds.filter((id) => id !== postId) : [...upvotedPostIds, postId]
    );

    setSpacePosts((prev) =>
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

  const filteredSpaces = spaces.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.primarySchool?.toLowerCase().includes(term) ||
      s.keyThinkers?.some((t) => t.toLowerCase().includes(term))
    );
  });

  const categoryBadge = (cat: string) => {
    switch (cat) {
      case "school":
        return <span className="space-cat-badge school">🏛️ School Circle</span>;
      case "thinker":
        return <span className="space-cat-badge thinker">🧠 Thinker Guild</span>;
      case "domain":
        return <span className="space-cat-badge domain">🔍 Domain Hub</span>;
      default:
        return <span className="space-cat-badge general">🌐 General Circle</span>;
    }
  };

  return (
    <div className="spaces-hub-container">
      {selectedSpace === null ? (
        /* =========================================================
           SPACES DIRECTORY GRID VIEW
           ========================================================= */
        <>
          <div className="spaces-header-row">
            <div>
              <h2>🏛️ Philosophical Spaces & Circles</h2>
              <p className="spaces-subtitle">
                Discover communities structured by Philosophical School, Key Thinker, and Domain of Inquiry.
              </p>
            </div>

            <button type="button" className="action-btn seed-btn" onClick={handleSeedSpaces}>
              🌱 Seed Philosophy Circles
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="spaces-filter-bar">
            <input
              type="text"
              className="filter-input search-space-input"
              placeholder="🔍 Search spaces by school, thinker, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="category-tabs-group">
              {[
                { id: "all", label: "All Circles" },
                { id: "school", label: "Philosophical Schools" },
                { id: "thinker", label: "Thinker Guilds" },
                { id: "domain", label: "Domains of Inquiry" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`category-tab-btn ${activeCategory === tab.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spaces Cards Grid */}
          {isLoading ? (
            <div className="loading-state">Loading philosophical spaces...</div>
          ) : error ? (
            <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: 20, margin: "16px 0", color: "#f87171", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: "1.05rem", display: "block", marginBottom: 4 }}>⚠️ Server / Database Connection Error</strong>
                <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>{error}. Unable to connect to local database.</span>
              </div>
              <button type="button" onClick={fetchSpaces} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                🔄 Retry
              </button>
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="empty-state" style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", margin: "16px 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>⭕</div>
              <h3 style={{ fontSize: "1.25rem", margin: "8px 0" }}>No Philosophical Circles Found</h3>
              <p style={{ color: "#94a3b8", maxWidth: 450, margin: "0 auto 16px auto" }}>
                {searchTerm ? `No circles matched "${searchTerm}".` : "There are no active circles in the database."}
              </p>
            </div>
          ) : (
            <div className="spaces-grid-list">
              {filteredSpaces.map((space) => (
                <div
                  key={space.id}
                  className="space-card-item"
                  onClick={() => setSelectedSpace(space)}
                >
                  {/* Space Banner & Avatar */}
                  <div
                    className="space-card-banner"
                    style={{
                      backgroundImage: space.bannerImage ? `url(${space.bannerImage})` : undefined,
                    }}
                  >
                    <div className="space-avatar-wrapper">
                      {space.avatarImage ? (
                        <img src={space.avatarImage} alt="Space" className="space-avatar-img" />
                      ) : (
                        <div className="space-avatar-circle">
                          {space.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-card-content">
                    <div className="space-card-header">
                      {categoryBadge(space.category)}
                      {space.isJoined && <span className="joined-chip">✓ Member</span>}
                    </div>

                    <h3 className="space-title">{space.name}</h3>
                    <p className="space-desc">{space.description}</p>

                    {/* Thinkers & School Tags */}
                    {space.keyThinkers && space.keyThinkers.length > 0 && (
                      <div className="space-thinkers-row">
                        {space.keyThinkers.slice(0, 3).map((thinker, i) => (
                          <span key={i} className="chip thinker-chip-sm">
                            🧠 {thinker}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer Stats & Join Button */}
                    <div className="space-card-footer">
                      <div className="space-meta-stats">
                        <span>👥 {space.membersCount.toLocaleString()} members</span>
                        <span>📜 {space.postsCount} arguments</span>
                      </div>

                      <button
                        type="button"
                        className={`join-btn ${space.isJoined ? "joined" : ""}`}
                        onClick={(e) => handleJoinToggle(space, e)}
                      >
                        {space.isJoined ? "Leave Circle" : "Join Circle"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* =========================================================
           SELECTED SPACE DETAILED VIEW
           ========================================================= */
        <div className="space-detail-view">
          {/* Back Navigation Bar */}
          <button
            type="button"
            className="back-btn"
            onClick={() => setSelectedSpace(null)}
          >
            ← Back to Spaces Directory
          </button>

          {/* Space Header Banner Hero */}
          <div
            className="space-hero-banner"
            style={{
              backgroundImage: selectedSpace.bannerImage
                ? `linear-gradient(to bottom, rgba(11, 15, 25, 0.4), rgba(11, 15, 25, 0.95)), url(${selectedSpace.bannerImage})`
                : undefined,
            }}
          >
            <div className="hero-content">
              <div className="hero-top-row">
                <div className="hero-avatar">
                  {selectedSpace.avatarImage ? (
                    <img src={selectedSpace.avatarImage} alt="Space Avatar" className="hero-avatar-img" />
                  ) : (
                    <div className="hero-avatar-circle">
                      {selectedSpace.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="hero-title-block">
                  <div className="hero-badges">
                    {categoryBadge(selectedSpace.category)}
                    {selectedSpace.primarySchool && (
                      <span className="chip school-chip">{selectedSpace.primarySchool}</span>
                    )}
                  </div>
                  <h2>{selectedSpace.name}</h2>
                  <p className="hero-desc">{selectedSpace.description}</p>
                </div>
              </div>

              <div className="hero-actions-bar">
                <div className="hero-stats">
                  <span>👥 {selectedSpace.membersCount.toLocaleString()} Members</span>
                  <span>📜 {selectedSpace.postsCount} Arguments Published</span>
                </div>

                <div className="hero-buttons">
                  <button
                    type="button"
                    className={`join-btn-lg ${selectedSpace.isJoined ? "joined" : ""}`}
                    onClick={() => handleJoinToggle(selectedSpace)}
                  >
                    {selectedSpace.isJoined ? "✓ Circle Member (Click to Leave)" : "Join Circle"}
                  </button>

                  {onOpenComposerForSpace && (
                    <button
                      type="button"
                      className="connect-btn"
                      onClick={() => onOpenComposerForSpace(selectedSpace)}
                    >
                      ✍️ Publish Argument to {selectedSpace.name}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Space Context View Tabs */}
          <div className="space-view-tabs">
            <button
              type="button"
              className={`space-tab-btn ${spaceViewTab === "feed" ? "active" : ""}`}
              onClick={() => setSpaceViewTab("feed")}
            >
              📜 Circle Discussions & Feed ({spacePosts.length})
            </button>
            <button
              type="button"
              className={`space-tab-btn ${spaceViewTab === "roster" ? "active" : ""}`}
              onClick={() => setSpaceViewTab("roster")}
            >
              👥 Key Thinkers & Member Roster
            </button>
          </div>

          {/* Tab Content */}
          {spaceViewTab === "feed" ? (
            <div className="space-posts-feed">
              {isPostsLoading ? (
                <div className="loading-state">Loading circle discussions...</div>
              ) : spacePosts.length === 0 ? (
                <div className="empty-state">No arguments published in this circle yet.</div>
              ) : (
                <div className="posts-list-grid">
                  {spacePosts.map((post) => {
                    const isUpvoted = upvotedPostIds.includes(post.id);
                    const isCommentsExpanded = expandedCommentsPostIds.includes(post.id);

                    return (
                      <div key={post.id} className="search-result-card post-feed-card">
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
                          </div>
                        </div>

                        <h3 className="result-title" style={{ marginTop: 12, fontSize: "1.25rem" }}>
                          {post.title}
                        </h3>
                        <p className="result-snippet" style={{ margin: "10px 0 16px 0", lineHeight: 1.5 }}>
                          {post.content}
                        </p>

                        <div className="card-actions" style={{ justifyContent: "space-between" }}>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className={`upvote-btn ${isUpvoted ? "active" : ""}`}
                              onClick={() => handleUpvotePost(post.id)}
                            >
                              ▲ {post.upvotesCount}
                            </button>

                            <button
                              type="button"
                              className={`action-btn ${isCommentsExpanded ? "active" : ""}`}
                              onClick={() => toggleCommentsSection(post.id)}
                            >
                              💬 Comments & Debate Tree ({post.commentsCount})
                            </button>

                            {onOpenDebateSummary && (
                              <button
                                type="button"
                                className="ai-summary-trigger-btn"
                                onClick={() => onOpenDebateSummary(post.id)}
                              >
                                🧠 AI Debate Summary
                              </button>
                            )}
                          </div>

                          {onOpenDM && (
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
                              💬 Message Author
                            </button>
                          )}
                        </div>

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
          ) : (
            /* Member Roster Tab */
            <div className="space-roster-view">
              <div className="roster-section">
                <h4>🧠 Core Philosophical Figures & Influences</h4>
                <div className="thinker-roster-grid">
                  {selectedSpace.keyThinkers?.map((thinker, i) => (
                    <div key={i} className="thinker-roster-card">
                      <div className="thinker-avatar-icon">🧠</div>
                      <div className="thinker-info">
                        <h5>{thinker}</h5>
                        <span>Historical Steward of {selectedSpace.primarySchool || selectedSpace.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="roster-section" style={{ marginTop: 28 }}>
                <h4>👥 Active Community Stewards</h4>
                <div className="stewards-list">
                  {[
                    { name: "Baruch Spinoza", handle: "spinoza", role: "Space Steward" },
                    { name: "Jean-Paul Sartre", handle: "sartre", role: "Discussion Leader" },
                    { name: "Albert Camus", handle: "camus", role: "Contributor" },
                  ].map((member, i) => (
                    <div key={i} className="steward-card">
                      <div className="steward-avatar">{member.name.charAt(0)}</div>
                      <div className="steward-details">
                        <span className="steward-name">{member.name}</span>
                        <span className="steward-handle">@{member.handle} • {member.role}</span>
                      </div>
                      {onOpenDM && (
                        <button
                          type="button"
                          className="connect-btn-sm"
                          onClick={() =>
                            onOpenDM({
                              id: `steward-${i}`,
                              name: member.name,
                              username: member.handle,
                            } as User)
                          }
                        >
                          💬 DM
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
