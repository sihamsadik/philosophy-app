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

  // Pending incoming & outgoing connection requests & local connection state tracking
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [acceptedUserIds, setAcceptedUserIds] = useState<Set<string>>(new Set());
  const [declinedUserIds, setDeclinedUserIds] = useState<Set<string>>(new Set());
  const [connectionCount, setConnectionCount] = useState<number>(0);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [recRes, reqRes, sentRes, countRes] = await Promise.all([
        agoraClient.getPeopleRecommendations({
          connectionIntent: selectedIntent === "all" ? undefined : selectedIntent,
          school: schoolFilter || undefined,
          thinker: thinkerFilter || undefined,
          limit: 10,
        }),
        agoraClient.getConnectionRequests().catch(() => ({ requests: [] })),
        agoraClient.getSentConnectionRequests().catch(() => ({ requests: [] })),
        agoraClient.getConnectionCount().catch(() => ({ count: 0 })),
      ]);
      setRecommendations(recRes.recommendations);
      setConnectionRequests(reqRes.requests || []);
      setSentRequests(sentRes.requests || []);
      setConnectionCount(countRes.count || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    const handleConnUpdate = () => fetchRecommendations();
    window.addEventListener("agora_connection_updated", handleConnUpdate);
    window.addEventListener("agora_notification_updated", handleConnUpdate);
    return () => {
      window.removeEventListener("agora_connection_updated", handleConnUpdate);
      window.removeEventListener("agora_notification_updated", handleConnUpdate);
    };
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
      setConnectionCount((prev) => prev + 1);
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
      <div className="feed-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>🤝 Philosopher Peer Discovery & Worldview Compatibility</h2>
          <p className="feed-subtitle">
            Discover fellow thinkers and co-debaters based on dual-axis compatibility: shared ground + productive philosophical tension.
          </p>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))",
            border: "1px solid rgba(168, 85, 247, 0.35)",
            borderRadius: 20,
            color: "#e2e8f0",
            fontWeight: 600,
            fontSize: "0.92rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          }}
          title="Total Established Connections"
        >
          <span style={{ fontSize: "1.1rem" }}>🤝</span>
          <span>{connectionCount} {connectionCount === 1 ? "Connection" : "Connections"}</span>
        </div>
      </div>

      {/* Top Section for Pending Connection Requests */}
      {connectionRequests.filter((r) => r.status === "pending").length > 0 && (
        <div
          className="pending-requests-top-section"
          style={{
            marginBottom: "1.5rem",
            padding: "1.25rem",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)",
            border: "1px solid rgba(168, 85, 247, 0.35)",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📬 Pending Connection Requests</span>
              <span
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}
              >
                {connectionRequests.filter((r) => r.status === "pending").length}
              </span>
            </h3>
            <span style={{ fontSize: "0.85rem", color: "#a5b4fc" }}>
              Approve or decline to connect & start direct messaging
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {connectionRequests
              .filter((r) => r.status === "pending")
              .map((req) => {
                const sender = req.sender;
                const senderId = sender?.id || "usr-001";
                return (
                  <div
                    key={req.id}
                    style={{
                      background: "rgba(15, 23, 42, 0.85)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: "12px",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {sender?.avatar ? (
                        <img
                          src={sender.avatar}
                          alt={sender.name || sender.username || "Thinker"}
                          style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(168, 85, 247, 0.5)" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "1.1rem",
                          }}
                        >
                          {(sender?.name || sender?.username || "P").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ overflow: "hidden" }}>
                        <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "#f8fafc", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {sender?.name || sender?.username || "Philosopher Peer"}
                        </h4>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                          @{sender?.username || "thinker"}
                        </p>
                      </div>
                    </div>

                    {req.message && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.85rem",
                          color: "#cbd5e1",
                          fontStyle: "italic",
                          background: "rgba(255, 255, 255, 0.05)",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          borderLeft: "3px solid #a855f7",
                        }}
                      >
                        "{req.message}"
                      </p>
                    )}

                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={() => handleAcceptConnection(req.id, senderId)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          boxShadow: "0 2px 6px rgba(34, 197, 94, 0.3)",
                        }}
                      >
                        🟢 Accept Connection
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineConnection(req.id, senderId)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          color: "#ef4444",
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        🔴 Decline
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

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
            
            // Authoritative relationship state from backend item OR fallback lookup
            const relState = (rec as any).relationshipState;
            const isIncoming = relState === "incoming_pending" ||
              connectionRequests.some((r) => r.status === "pending" && (r.sender?.id === user.id || r.sender?.username === user.username));
            const isOutgoing = relState === "outgoing_pending" ||
              sentRequests.some((r) => r.status === "pending" && (r.recipientId === user.id || r.sender?.id === user.id));
            const isConnected = relState === "connected" || acceptedUserIds.has(user.id);
            const isDeclined = declinedUserIds.has(user.id);

            const pendingReq = connectionRequests.find(
              (r) => r.status === "pending" && (r.sender?.id === user.id || r.sender?.username === user.username)
            );

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
                  {isConnected ? (
                    <span className="status-accepted-chip" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "6px 12px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600 }}>
                      ✓ Connected
                    </span>
                  ) : isDeclined ? (
                    <span className="status-declined-chip" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "6px 12px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600 }}>
                      ✕ Request Declined
                    </span>
                  ) : isOutgoing ? (
                    <span className="status-pending-chip" style={{ background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.35)", color: "#eab308", padding: "6px 12px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      ⌛ Invitation Sent
                    </span>
                  ) : isIncoming && pendingReq ? (
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
