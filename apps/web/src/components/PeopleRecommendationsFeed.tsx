import React, { useState, useEffect } from "react";
import type { User, UserRecommendation, ConnectionIntent } from "@philosophy/contract";
import { agoraClient, type ConnectionRequest } from "../lib/api-client.js";
import { DualAxisCompatibilityGauge } from "./DualAxisCompatibilityGauge.js";

const INTENT_FILTERS: { id: ConnectionIntent | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All Thinkers", icon: "🌐" },
  { id: "discussion", label: "Debate Partners", icon: "⚔️" },
  { id: "intellectual", label: "Intellectual Peers", icon: "🧠" },
  { id: "friendship", label: "Reading Partners", icon: "📖" },
];

export interface PeopleRecommendationsFeedProps {
  onOpenDM?: (user: User) => void;
  onOpenConnectModal?: (user: User) => void;
}

export const PeopleRecommendationsFeed: React.FC<PeopleRecommendationsFeedProps> = ({ onOpenDM, onOpenConnectModal }) => {
  const [recommendations, setRecommendations] = useState<UserRecommendation[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<ConnectionIntent | "all">("all");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [thinkerFilter, setThinkerFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending incoming connection requests & local connection state tracking
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [acceptedUserIds, setAcceptedUserIds] = useState<Set<string>>(new Set());
  const [declinedUserIds, setDeclinedUserIds] = useState<Set<string>>(new Set());

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [recRes, reqRes] = await Promise.all([
        agoraClient.getPeopleRecommendations({
          connectionIntent: selectedIntent === "all" ? undefined : selectedIntent,
          school: schoolFilter || undefined,
          thinker: thinkerFilter || undefined,
          limit: 10,
        }),
        agoraClient.getConnectionRequests().catch(() => ({ requests: [] })),
      ]);
      setRecommendations(recRes.recommendations);
      setConnectionRequests(reqRes.requests || []);
    } catch (err: any) {
      setError(err.message || "Failed to load recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [selectedIntent]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecommendations();
  };

  const handleAcceptConnection = async (requestId: string, userId: string) => {
    try {
      await agoraClient.acceptConnectionRequest(requestId);
      setAcceptedUserIds((prev) => new Set([...prev, userId]));
      setConnectionRequests((prev) => prev.filter((r) => r.id !== requestId));
      window.dispatchEvent(new CustomEvent("agora_notification_updated"));
    } catch (err) {
      console.error("Failed to accept connection:", err);
    }
  };

  const handleDeclineConnection = async (requestId: string, userId: string) => {
    try {
      await agoraClient.declineConnectionRequest(requestId);
      setDeclinedUserIds((prev) => new Set([...prev, userId]));
      setConnectionRequests((prev) => prev.filter((r) => r.id !== requestId));
      window.dispatchEvent(new CustomEvent("agora_notification_updated"));
    } catch (err) {
      console.error("Failed to decline connection:", err);
    }
  };

  return (
    <div className="recommendations-feed-container">
      <div className="feed-header">
        <h2>🤝 Philosopher Peer Discovery & Worldview Compatibility</h2>
        <p className="feed-subtitle">
          Discover fellow thinkers and co-debaters based on dual-axis compatibility: shared ground + productive philosophical tension.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="feed-filter-bar">
        <div className="intent-tabs">
          {INTENT_FILTERS.map((tab) => (
            <button
              key={tab.id}
              className={`intent-tab-btn ${selectedIntent === tab.id ? "active" : ""}`}
              onClick={() => setSelectedIntent(tab.id)}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="search-filter-inputs">
          <input
            type="text"
            className="filter-input"
            placeholder="Filter by school (e.g. Existentialism)..."
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
          />
          <input
            type="text"
            className="filter-input"
            placeholder="Filter by thinker (e.g. Spinoza)..."
            value={thinkerFilter}
            onChange={(e) => setThinkerFilter(e.target.value)}
          />
          <button type="submit" className="filter-submit-btn">
            Apply Filters
          </button>
        </form>
      </div>

      {/* Recommendations Feed List */}
      {isLoading ? (
        <div className="feed-loading">
          <div className="spinner" />
          <p>Calculating dual-axis intellectual compatibility...</p>
        </div>
      ) : error ? (
        <div className="feed-error">
          <p>{error}</p>
          <button onClick={fetchRecommendations} className="retry-btn">
            Retry
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="feed-empty">
          <p>No candidate connections match your active filters.</p>
          <button onClick={() => { setSelectedIntent("all"); setSchoolFilter(""); setThinkerFilter(""); }} className="reset-btn">
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="recommendations-grid">
          {recommendations.map((rec) => {
            const { user, compatibility } = rec;
            const profile = user.philosophyProfile;
            
            // Check if there is an incoming pending connection request from this user
            const pendingReq = connectionRequests.find(
              (r) => r.status === "pending" && (r.sender?.id === user.id || r.sender?.username === user.username)
            );
            const isAccepted = acceptedUserIds.has(user.id);
            const isDeclined = declinedUserIds.has(user.id);

            return (
              <div key={user.id} className="user-recommendation-card">
                <div className="user-card-header">
                  <div className="user-avatar-block">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="navbar-avatar-img" />
                    ) : (
                      <div className="avatar-circle">
                        {(user.name || user.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="user-identity">
                      <h3>{user.name || user.username}</h3>
                      <span className="username-handle">@{user.username || "philosopher"}</span>
                    </div>
                  </div>
                  <div className="reputation-badge">
                    <span>⚡ {user.reputation ?? 0} Rep</span>
                  </div>
                </div>

                {profile?.worldviewSummary && (
                  <p className="user-bio-summary">"{profile.worldviewSummary}"</p>
                )}

                {/* Compatibility Gauge */}
                <DualAxisCompatibilityGauge compatibility={compatibility} />

                {/* Action Buttons */}
                <div className="card-actions" style={{ gap: 10, flexWrap: "wrap" }}>
                  {isAccepted ? (
                    <span className="status-accepted-chip" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "6px 12px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600 }}>
                      ✓ Connected
                    </span>
                  ) : isDeclined ? (
                    <span className="status-declined-chip" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "6px 12px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600 }}>
                      ✕ Request Declined
                    </span>
                  ) : pendingReq ? (
                    /* Incoming Request: show Accept and Decline choice directly on card */
                    <div style={{ display: "flex", gap: 8, width: "100%" }}>
                      <button
                        className="accept-req-btn"
                        style={{ flex: 1, fontSize: "0.85rem", padding: "8px 12px", borderRadius: 8, background: "#10b981", color: "#ffffff", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                        onClick={() => handleAcceptConnection(pendingReq.id, user.id)}
                      >
                        🟢 Accept Connection
                      </button>
                      <button
                        className="decline-req-btn"
                        style={{ fontSize: "0.85rem", padding: "8px 12px", borderRadius: 8, background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.4)", cursor: "pointer", fontWeight: 600 }}
                        onClick={() => handleDeclineConnection(pendingReq.id, user.id)}
                      >
                        🔴 Decline
                      </button>
                    </div>
                  ) : (
                    <>
                      {onOpenConnectModal && (
                        <button
                          className="connect-btn"
                          style={{ fontSize: "0.85rem" }}
                          onClick={() => onOpenConnectModal(user)}
                        >
                          🤝 Send Invite
                        </button>
                      )}
                      <button
                        className="action-btn"
                        style={{ fontSize: "0.85rem" }}
                        onClick={() => onOpenDM && onOpenDM(user)}
                      >
                        💬 Message
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
