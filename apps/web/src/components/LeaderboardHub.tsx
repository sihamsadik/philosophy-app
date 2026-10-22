import React, { useState, useEffect } from "react";
import { Trophy, Globe, Flame, Landmark, Zap, Coffee, TriangleAlert, RefreshCw, Crown, Medal, MessageCircle, Lock, ChartBar } from "lucide-react";
import type { User } from "@philosophy/contract";
import { agoraClient, DEMO_LEADERBOARD, ALL_PLATFORM_BADGES, type LeaderboardEntry, type PhilosophicalBadge } from "../lib/api-client.js";

export interface LeaderboardHubProps {
  onOpenDM?: (targetUser: User) => void;
}

export const LeaderboardHub: React.FC<LeaderboardHubProps> = ({ onOpenDM }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [badges, setBadges] = useState<PhilosophicalBadge[]>(ALL_PLATFORM_BADGES);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await agoraClient.getLeaderboard(selectedSchool);
      setEntries(res.entries);
      const currentUserId = agoraClient.getCurrentUserId();
      const targetUserId = (currentUserId && currentUserId !== "guest") ? currentUserId : res.entries[0]?.user?.id;
      if (targetUserId) {
        try {
          const userBadges = await agoraClient.getUserBadges(targetUserId);
          if (userBadges?.badges && userBadges.badges.length > 0) {
            setBadges(userBadges.badges);
          }
        } catch {
          // ignore fallback
        }
      }
    } catch (err: any) {
      console.error("Failed to load leaderboard:", err);
      setError(err.message || "Unable to fetch leaderboard data from database.");
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [selectedSchool]);

  const topThree = entries.slice(0, 3);
  const remainingEntries = entries.slice(3);

  const getRankMedal = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal size={16} style={{ color: "#FFD700" }} />;
      case 2:
        return <Medal size={16} style={{ color: "#C0C0C0" }} />;
      case 3:
        return <Medal size={16} style={{ color: "#CD7F32" }} />;
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="leaderboard-hub-container">
      {/* Hero Banner Header */}
      <div className="leaderboard-hero-banner">
        <div className="hero-badge"><Trophy size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> INTELLECTUAL REPUTATION & BADGES</div>
        <h2>Community Philosophy Leaderboard</h2>
        <p>
          Recognizing the most impactful thinkers, debate dialecticians, and symposium stewards across the global Agora network.
        </p>

        {/* Tradition Filter Tabs */}
        <div className="tradition-tabs-bar">
          <button
            className={`tab-btn ${selectedSchool === "all" ? "active" : ""}`}
            onClick={() => setSelectedSchool("all")}
          >
            <Globe size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> All Traditions
          </button>
          <button
            className={`tab-btn ${selectedSchool === "Existentialism" ? "active" : ""}`}
            onClick={() => setSelectedSchool("Existentialism")}
          >
            <Flame size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Existentialism
          </button>
          <button
            className={`tab-btn ${selectedSchool === "Stoicism" ? "active" : ""}`}
            onClick={() => setSelectedSchool("Stoicism")}
          >
            <Landmark size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Stoicism
          </button>
          <button
            className={`tab-btn ${selectedSchool === "Rationalism" ? "active" : ""}`}
            onClick={() => setSelectedSchool("Rationalism")}
          >
            <Zap size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Rationalism
          </button>
          <button
            className={`tab-btn ${selectedSchool === "Absurdism" ? "active" : ""}`}
            onClick={() => setSelectedSchool("Absurdism")}
          >
            <Coffee size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Absurdism
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Calculating community reputation scores...</p>
        </div>
      ) : error ? (
        <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: 20, margin: "16px 0", color: "#f87171", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: "1.05rem", display: "block", marginBottom: 4 }}><TriangleAlert size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Database / Backend Connection Error</strong>
            <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>{error}. Unable to load leaderboard from database.</span>
          </div>
          <button type="button" onClick={loadLeaderboard} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Retry
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state" style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", margin: "16px 0" }}>
          <Trophy size={40} color="#f59e0b" style={{ marginBottom: 8 }} />
          <h3 style={{ fontSize: "1.25rem", margin: "8px 0" }}>No Leaderboard Scores Available</h3>
          <p style={{ color: "#94a3b8", maxWidth: 450, margin: "0 auto 16px auto" }}>
            {selectedSchool !== "all" ? `No thinkers found in school "${selectedSchool}".` : "There are currently no registered profiles in the database."}
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Visual Podiums */}
          {topThree.length > 0 && (
            <div className="podiums-container">
              {/* 2nd Place Silver */}
              {topThree[1] && (
                <div className="podium-card rank-2">
                  <div className="podium-rank-badge"><Medal size={14} style={{ color: "#C0C0C0", marginRight: 4 }} /> 2nd</div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('agora_open_profile', { detail: { user: topThree[1]!.user } }));
                    }}
                    style={{ cursor: "pointer", display: "inline-block" }}
                    title={`View ${topThree[1]!.user.name || topThree[1]!.user.username}'s profile`}
                  >
                    {topThree[1]!.user.avatar ? (
                      <img
                        src={topThree[1]!.user.avatar}
                        alt={topThree[1]!.user.name || topThree[1]!.user.username || "Thinker"}
                        className="podium-avatar"
                      />
                    ) : (
                      <div className="podium-avatar initials-avatar">
                        {(topThree[1]!.user.name || topThree[1]!.user.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3
                    className="podium-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('agora_open_profile', { detail: { user: topThree[1]!.user } }));
                    }}
                    style={{ cursor: "pointer" }}
                    title={`View ${topThree[1]!.user.name || topThree[1]!.user.username}'s profile`}
                  >
                    {topThree[1]!.user.name || topThree[1]!.user.username}
                  </h3>
                  <span className="podium-school">{topThree[1].primarySchool}</span>

                  <div className="rep-score-chip">
                    <Zap size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> {topThree[1].reputationPoints.toLocaleString()} Rep
                  </div>

                  <div className="podium-badges-row">
                    {topThree[1].badges.map((b: PhilosophicalBadge) => (
                      <span key={b.id} className="badge-pill-sm" title={b.description}>
                        {b.icon}
                      </span>
                    ))}
                  </div>

                  {onOpenDM && topThree[1]?.user && (
                    <button
                      className="btn-dm-podium"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDM(topThree[1]!.user);
                      }}
                    >
                      <MessageCircle size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> DM
                    </button>
                  )}
                </div>
              )}

              {/* 1st Place Gold */}
              {topThree[0] && (
                <div className="podium-card rank-1">
                  <Crown size={22} color="#f59e0b" className="podium-crown" />
                  <div className="podium-rank-badge gold-badge"><Medal size={14} style={{ color: "#FFD700", marginRight: 4 }} /> 1st Place</div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('agora_open_profile', { detail: { user: topThree[0]!.user } }));
                    }}
                    style={{ cursor: "pointer", display: "inline-block" }}
                    title={`View ${topThree[0]!.user.name || topThree[0]!.user.username}'s profile`}
                  >
                    {topThree[0]!.user.avatar ? (
                      <img
                        src={topThree[0]!.user.avatar}
                        alt={topThree[0]!.user.name || topThree[0]!.user.username || "Thinker"}
                        className="podium-avatar rank-1-avatar"
                      />
                    ) : (
                      <div className="podium-avatar rank-1-avatar initials-avatar">
                        {(topThree[0]!.user.name || topThree[0]!.user.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3
                    className="podium-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('agora_open_profile', { detail: { user: topThree[0]!.user } }));
                    }}
                    style={{ cursor: "pointer" }}
                    title={`View ${topThree[0]!.user.name || topThree[0]!.user.username}'s profile`}
                  >
                    {topThree[0]!.user.name || topThree[0]!.user.username}
                  </h3>
                  <span className="podium-school">{topThree[0].primarySchool}</span>

                  <div className="rep-score-chip gold-rep">
                    <Zap size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> {topThree[0].reputationPoints.toLocaleString()} Rep
                  </div>

                  <div className="podium-badges-row">
                    {topThree[0].badges.map((b: PhilosophicalBadge) => (
                      <span key={b.id} className="badge-pill-sm" title={b.description}>
                        {b.icon}
                      </span>
                    ))}
                  </div>

                  {onOpenDM && topThree[0]?.user && (
                    <button
                      className="btn-dm-podium gold-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDM(topThree[0]!.user);
                      }}
                    >
                      <MessageCircle size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> DM Champion
                    </button>
                  )}
                </div>
              )}

              {/* 3rd Place Bronze */}
              {topThree[2] && (
                <div className="podium-card rank-3">
                  <div className="podium-rank-badge"><Medal size={14} style={{ color: "#CD7F32", marginRight: 4 }} /> 3rd</div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('agora_open_profile', { detail: { user: topThree[2]!.user } }));
                    }}
                    style={{ cursor: "pointer", display: "inline-block" }}
                    title={`View ${topThree[2]!.user.name || topThree[2]!.user.username}'s profile`}
                  >
                    {topThree[2]!.user.avatar ? (
                      <img
                        src={topThree[2]!.user.avatar}
                        alt={topThree[2]!.user.name || topThree[2]!.user.username || "Thinker"}
                        className="podium-avatar"
                      />
                    ) : (
                      <div className="podium-avatar initials-avatar">
                        {(topThree[2]!.user.name || topThree[2]!.user.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3
                    className="podium-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('agora_open_profile', { detail: { user: topThree[2]!.user } }));
                    }}
                    style={{ cursor: "pointer" }}
                    title={`View ${topThree[2]!.user.name || topThree[2]!.user.username}'s profile`}
                  >
                    {topThree[2]!.user.name || topThree[2]!.user.username}
                  </h3>
                  <span className="podium-school">{topThree[2].primarySchool}</span>

                  <div className="rep-score-chip">
                    <Zap size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> {topThree[2].reputationPoints.toLocaleString()} Rep
                  </div>

                  <div className="podium-badges-row">
                    {topThree[2].badges.map((b: PhilosophicalBadge) => (
                      <span key={b.id} className="badge-pill-sm" title={b.description}>
                        {b.icon}
                      </span>
                    ))}
                  </div>

                  {onOpenDM && topThree[2]?.user && (
                    <button
                      className="btn-dm-podium"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDM(topThree[2]!.user);
                      }}
                    >
                      <MessageCircle size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> DM
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Full Rankings Table */}
          <div className="leaderboard-table-card">
            <h3 className="section-title"><ChartBar size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> Complete Community Rankings</h3>
            <div className="table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Philosopher</th>
                    <th>School / Tradition</th>
                    <th>Arguments</th>
                    <th>Symposiums</th>
                    <th>Reputation</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.user.id} className="leaderboard-row">
                      <td className="rank-cell">
                        <span className="rank-display">{getRankMedal(entry.rank)}</span>
                      </td>

                      <td className="user-cell">
                        <div
                          className="user-info-group"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('agora_open_profile', { detail: { user: entry.user } }));
                          }}
                          style={{ cursor: "pointer" }}
                          title={`View ${entry.user.name || entry.user.username}'s profile`}
                        >
                          {entry.user.avatar ? (
                            <img
                              src={entry.user.avatar}
                              alt={entry.user.name || entry.user.username || "User"}
                              className="table-avatar"
                            />
                          ) : (
                            <div className="table-avatar initials-avatar">
                              {(entry.user.name || entry.user.username || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="table-user-details">
                            <span className="table-user-name">
                              {entry.user.name || entry.user.username}
                            </span>
                            <span className="table-user-handle">@{entry.user.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="school-cell">
                        <span className="school-tag">{entry.primarySchool}</span>
                      </td>

                      <td className="stats-cell">{entry.argumentsCount}</td>
                      <td className="stats-cell">{entry.symposiumsHosted}</td>

                      <td className="rep-cell">
                        <span className="rep-badge"><Zap size={12} style={{ marginRight: 3, verticalAlign: "middle" }} /> {entry.reputationPoints.toLocaleString()}</span>
                      </td>

                      <td className="action-cell">
                        {onOpenDM && (
                          <button
                            className="table-dm-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDM(entry.user);
                            }}
                          >
                            <MessageCircle size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> DM
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform Achievement Badges Showcase */}
          <div className="badges-showcase-section">
            <h3 className="section-title"><Trophy size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> Platform Achievement Badges</h3>
            <p className="section-subtitle">
              Earn reputation and contribute arguments, debates, and symposiums to unlock community achievements.
            </p>

            <div className="badges-grid">
              {badges.map((badge) => (
                <div key={badge.id} className="badge-showcase-card">
                  <div className="badge-icon-wrapper">{badge.icon}</div>
                  <div className="badge-card-content">
                    <h4>{badge.title}</h4>
                    <p className="badge-desc">{badge.description}</p>
                    <div className="badge-footer-meta">
                      <span className={`badge-category-chip cat-${badge.category}`}>
                        {badge.category.toUpperCase()}
                      </span>
                      {(badge.progressPercentage ?? 0) >= 100 ? (
                        <span className="badge-status-unlocked" style={{ color: "#10b981", fontWeight: 600 }}>✓ Unlocked</span>
                      ) : (
                        <span className="badge-status-locked" style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>
                        <Lock size={12} style={{ marginRight: 4, verticalAlign: "middle" }} /> {badge.progressPercentage ?? 0}% Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
