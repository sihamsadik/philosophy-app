import React, { useState, useEffect } from "react";
import type { User, ConnectionIntent } from "@philosophy/contract";
import type { PhilosophicalPost, ConnectionRequest } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";
import { DualAxisCompatibilityGauge } from "./DualAxisCompatibilityGauge.js";

export interface PublicUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User | { id: string; name?: string; username?: string; avatar?: string } | null;
  onOpenDM?: (user: User) => void;
  onEditOwnProfile?: () => void;
  onOpenThreadDrawer?: (postId: string) => void;
}

export const PublicUserProfileModal: React.FC<PublicUserProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onOpenDM,
  onEditOwnProfile,
  onOpenThreadDrawer,
}) => {
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [compatibility, setCompatibility] = useState<any | null>(null);
  const [connectionCount, setConnectionCount] = useState<number>(0);
  const [userPosts, setUserPosts] = useState<PhilosophicalPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection State
  const [relationshipState, setRelationshipState] = useState<"none" | "outgoing_pending" | "incoming_pending" | "connected" | "self">("none");
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const currentUserId = agoraClient.getCurrentUserId();
  const targetUserId = targetUser?.id;

  const loadProfileData = async () => {
    if (!targetUserId) return;
    setIsLoading(true);
    setError(null);

    const isSelf = currentUserId === targetUserId;

    try {
      // Fetch User profile details
      let userData: User | null = null;
      try {
        userData = await agoraClient.getUser(targetUserId);
      } catch {
        if ("username" in (targetUser || {}) && targetUser?.username) {
          userData = await agoraClient.getUserByUsername(targetUser.username).catch(() => null);
        }
      }
      const activeUser = userData || (targetUser as User);
      setFullUser(activeUser);

      // Fetch Connection count & posts
      const [countRes, postsRes] = await Promise.all([
        agoraClient.getConnectionCount(targetUserId).catch(() => ({ count: 0 })),
        agoraClient.getPosts(targetUserId).catch(() => ({ posts: [] })),
      ]);
      setConnectionCount(countRes.count || 0);
      setUserPosts(postsRes.posts || []);

      if (isSelf) {
        setRelationshipState("self");
      } else {
        // Determine relationship state
        try {
          const [compatRes, recRes, reqRes, sentRes] = await Promise.all([
            agoraClient.getUserCompatibility(targetUserId).catch(() => null),
            agoraClient.getPeopleRecommendations().catch(() => ({ recommendations: [] })),
            agoraClient.getConnectionRequests().catch(() => ({ requests: [] })),
            agoraClient.getSentConnectionRequests().catch(() => ({ requests: [] })),
          ]);

          if (compatRes?.compatibility) {
            setCompatibility(compatRes.compatibility);
          }

          // Check incoming request from targetUser
          const incomingReq = (reqRes.requests || []).find((r: any) => r.sender?.id === targetUserId || r.user?.id === targetUserId);
          const outgoingReq = (sentRes.requests || []).find((r: any) => r.recipientId === targetUserId || r.user?.id === targetUserId);
          const recMatch = (recRes.recommendations || []).find((r: any) => r.id === targetUserId);

          if (incomingReq) {
            setRelationshipState("incoming_pending");
            setIncomingRequestId(incomingReq.id);
          } else if (outgoingReq) {
            setRelationshipState("outgoing_pending");
          } else if ((recMatch as any)?.relationshipState === "connected") {
            setRelationshipState("connected");
          } else if ((recMatch as any)?.relationshipState === "outgoing_pending") {
            setRelationshipState("outgoing_pending");
          } else if ((recMatch as any)?.relationshipState === "incoming_pending") {
            setRelationshipState("incoming_pending");
          } else {
            setRelationshipState("none");
          }
        } catch {
          setRelationshipState("none");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load user profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && targetUserId) {
      loadProfileData();
    }
  }, [isOpen, targetUserId]);

  if (!isOpen || !targetUser) return null;

  const displayName = fullUser?.name || targetUser.name || targetUser.username || "Philosophical Thinker";
  const handleTag = (fullUser?.username || targetUser.username) ? `@${fullUser?.username || targetUser.username}` : "@thinker";
  const userBio = fullUser?.bio || "Exploring foundational questions of existence, mind, and ethics on Philosophy Community.";
  const userAvatar = fullUser?.avatar || targetUser.avatar;
  const reputation = fullUser?.reputation ?? 150;
  const prof = fullUser?.philosophyProfile;

  const isSelf = relationshipState === "self" || currentUserId === targetUserId;

  const handleConnectClick = async () => {
    if (!targetUserId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await agoraClient.sendConnectionRequest(targetUserId, undefined, (targetUser as User) || fullUser || undefined);
      setRelationshipState("outgoing_pending");
      window.dispatchEvent(new CustomEvent("agora_connection_updated"));
    } catch (err) {
      console.error("Failed to send connection request:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAcceptClick = async () => {
    if (!incomingRequestId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await agoraClient.acceptConnectionRequest(incomingRequestId);
      setRelationshipState("connected");
      setConnectionCount((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent("agora_connection_updated"));
    } catch (err) {
      console.error("Failed to accept request:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeclineClick = async () => {
    if (!incomingRequestId || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await agoraClient.declineConnectionRequest(incomingRequestId);
      setRelationshipState("none");
      setIncomingRequestId(null);
      window.dispatchEvent(new CustomEvent("agora_connection_updated"));
    } catch (err) {
      console.error("Failed to decline request:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMessageClick = () => {
    if (onOpenDM && (fullUser || targetUser)) {
      onClose();
      onOpenDM((fullUser as User) || (targetUser as User));
    }
  };

  return (
    <div
      className="drawer-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1200,
        padding: "16px",
      }}
    >
      <div
        className="settings-modal-pane"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 860,
          width: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#0d1322",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Header & Close button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span>👤 Public Thinker Profile</span>
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Close Profile"
            style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>
            <p>Loading public profile...</p>
          </div>
        ) : error ? (
          <div style={{ padding: "24px", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: 12 }}>
            <p>{error}</p>
          </div>
        ) : (
          <div className="philosophy-profile-view-container" style={{ margin: 0, padding: 0 }}>
            {/* Profile Hero Cover Card */}
            <div className="profile-hero-card" style={{ marginBottom: 16 }}>
              <div className="profile-hero-banner" />
              <div className="profile-hero-content">
                <div className="profile-hero-left">
                  <div className="profile-avatar-large">
                    {userAvatar ? (
                      <img src={userAvatar} alt={displayName} className="avatar-img-full" />
                    ) : (
                      <div className="avatar-placeholder-large">{displayName.charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                  <div className="profile-user-details">
                    <div className="profile-name-row" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h1 className="profile-display-name">{displayName}</h1>
                      <span className="profile-reputation-badge" title="Philosophy Reputation Score">
                        ⚡ {reputation} Rep
                      </span>
                      <span
                        className="profile-reputation-badge"
                        style={{
                          background: "rgba(99, 102, 241, 0.18)",
                          border: "1px solid rgba(99, 102, 241, 0.4)",
                          color: "#818cf8",
                        }}
                        title="Total Established Connections"
                      >
                        🤝 {connectionCount} {connectionCount === 1 ? "Connection" : "Connections"}
                      </span>
                    </div>
                    <p className="profile-handle-text">{handleTag}</p>
                    <p className="profile-bio-text">{userBio}</p>
                  </div>
                </div>

                {/* Relationship Actions */}
                <div className="profile-hero-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {isSelf ? (
                    <button
                      type="button"
                      className="edit-profile-action-btn"
                      onClick={() => {
                        onClose();
                        if (onEditOwnProfile) onEditOwnProfile();
                      }}
                    >
                      ✏️ Edit Profile
                    </button>
                  ) : (
                    <>
                      {relationshipState === "connected" && (
                        <>
                          <span
                            style={{
                              padding: "8px 14px",
                              borderRadius: 20,
                              background: "rgba(34, 197, 94, 0.15)",
                              border: "1px solid rgba(34, 197, 94, 0.4)",
                              color: "#4ade80",
                              fontWeight: 600,
                              fontSize: "0.88rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            ✓ Connected
                          </span>
                          <button
                            type="button"
                            className="connect-btn-sm"
                            style={{ background: "#4f46e5", color: "#fff" }}
                            onClick={handleMessageClick}
                          >
                            💬 Direct Message
                          </button>
                        </>
                      )}

                      {relationshipState === "outgoing_pending" && (
                        <button
                          type="button"
                          className="connect-btn-sm"
                          disabled
                          style={{ opacity: 0.65, cursor: "not-allowed", background: "rgba(148, 163, 184, 0.2)" }}
                        >
                          ⌛ Invitation Sent
                        </button>
                      )}

                      {relationshipState === "incoming_pending" && (
                        <>
                          <button
                            type="button"
                            className="connect-btn-sm"
                            style={{ background: "#16a34a", color: "#fff" }}
                            onClick={handleAcceptClick}
                            disabled={isActionLoading}
                          >
                            🟢 Accept Connection
                          </button>
                          <button
                            type="button"
                            className="connect-btn-sm"
                            style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171" }}
                            onClick={handleDeclineClick}
                            disabled={isActionLoading}
                          >
                            🔴 Decline
                          </button>
                        </>
                      )}

                      {relationshipState === "none" && (
                        <>
                          <button
                            type="button"
                            className="connect-btn-sm"
                            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#fff" }}
                            onClick={handleConnectClick}
                            disabled={isActionLoading}
                          >
                            🤝 Connect
                          </button>
                          <button
                            type="button"
                            className="connect-btn-sm"
                            style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#e2e8f0" }}
                            onClick={handleMessageClick}
                          >
                            💬 Message Request
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Dual-Axis Intellectual Compatibility Score Gauge */}
            {compatibility && !isSelf && (
              <div className="profile-section-card" style={{ marginBottom: 16 }}>
                <DualAxisCompatibilityGauge compatibility={compatibility} />
              </div>
            )}

            {/* Favorite Quote */}
            {prof?.favoriteQuote && (
              <div className="profile-section-card" style={{ marginBottom: 16 }}>
                <div className="section-card-header">
                  <h3>💬 Favorite Philosophical Quote</h3>
                </div>
                <div className="worldview-quote-box" style={{ borderLeftColor: "#a855f7" }}>
                  <p className="quote-text">"{prof.favoriteQuote}"</p>
                  {prof.quoteAuthor && (
                    <p style={{ marginTop: 8, color: "#a5b4fc", fontWeight: 600, fontSize: "0.92rem" }}>
                      — {prof.quoteAuthor}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Personal Worldview Summary */}
            {prof?.worldviewSummary && (
              <div className="profile-section-card" style={{ marginBottom: 16 }}>
                <div className="section-card-header">
                  <h3>🧠 Personal Worldview & Stance</h3>
                </div>
                <div className="worldview-quote-box">
                  <p className="quote-text">"{prof.worldviewSummary}"</p>
                </div>
              </div>
            )}

            {/* Philosophical Framework Grid */}
            {prof && (
              <div className="profile-grid-two-col" style={{ marginBottom: 16 }}>
                {/* Primary Schools */}
                {prof.primarySchools && prof.primarySchools.length > 0 && (
                  <div className="profile-section-card">
                    <div className="section-card-header">
                      <h3>📜 Primary Philosophical Schools</h3>
                    </div>
                    <div className="tag-cloud">
                      {prof.primarySchools.map((school, i) => (
                        <span key={i} className="philosophy-tag school-tag">
                          {school}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Thinkers */}
                {prof.keyThinkers && prof.keyThinkers.length > 0 && (
                  <div className="profile-section-card">
                    <div className="section-card-header">
                      <h3>🏛️ Influential Thinkers & Authors</h3>
                    </div>
                    <div className="tag-cloud">
                      {prof.keyThinkers.map((thinker, i) => (
                        <span key={i} className="philosophy-tag thinker-tag">
                          {thinker}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Authored Posts & Discussions */}
            <div className="profile-section-card">
              <div className="section-card-header">
                <h3>📝 Authored Arguments & Discussions ({userPosts.length})</h3>
              </div>
              {userPosts.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.92rem", fontStyle: "italic" }}>
                  No published debates or posts yet from this author.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {userPosts.map((post) => (
                    <div
                      key={post.id}
                      style={{
                        padding: "14px",
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 12,
                        cursor: onOpenThreadDrawer ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (onOpenThreadDrawer) {
                          onClose();
                          onOpenThreadDrawer(post.id);
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            textTransform: "uppercase",
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "rgba(99, 102, 241, 0.2)",
                            color: "#a5b4fc",
                            fontWeight: 700,
                          }}
                        >
                          {post.postType || "argument"}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{post.createdAt}</span>
                      </div>
                      <h4 style={{ margin: "4px 0 8px 0", color: "#f8fafc", fontSize: "1.05rem" }}>{post.title}</h4>
                      <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.92rem", lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {post.content}
                      </p>
                      <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: "0.85rem", color: "#94a3b8" }}>
                        <span>⚡ {post.upvotesCount} Insightful</span>
                        <span>💬 {post.commentsCount} Comments</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
