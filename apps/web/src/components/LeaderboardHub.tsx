import React, { useState, useEffect } from "react";
import type { User } from "@agora-server/contract";
import type { LeaderboardEntry, PhilosophicalBadge } from "../lib/api-client.js";
import { agoraClient, DEMO_LEADERBOARD, ALL_PLATFORM_BADGES } from "../lib/api-client.js";

export interface LeaderboardHubProps {
  onOpenDM?: (targetUser: User) => void;
}

export const LeaderboardHub: React.FC<LeaderboardHubProps> = ({ onOpenDM }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [badges, setBadges] = useState<PhilosophicalBadge[]>(ALL_PLATFORM_BADGES);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      const res = await agoraClient.getLeaderboard(selectedSchool);
      setEntries(res.entries);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setEntries(DEMO_LEADERBOARD);
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
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="leaderboard-hub-container">
      {/* Hero Banner Header */}
      <div className="leaderboard-hero-banner">
        <div className="hero-badge">🏆 INTELLECTUAL REPUTATION & BADGES</div>
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
            🌐 All Traditions
          </button>
          <button
            className={`tab-btn ${selectedSchool === "Existentialism" ? "active" : ""}`}
            onClick={() => setSelectedSchool("Existentialism")}
          >
            🔥 Existentialism
          </button>
          <button
            className={`tab-btn ${selectedSchool === "Stoicism" ? "active" : ""}`}
            onClick={() => setSelectedSchool("Stoicism")}
          >
            🏛️ Stoicism
          </button>
          <button
            className={`tab-btn ${selectedSchool === "Rationalism" ? "active" : ""}`}
            onClick={() => setSelectedSchool("Rationalism")}
          >
            ⚡ Rationalism
          </button>
          <button
            className={`tab-btn ${selectedSchool === "Absurdism" ? "active" : ""}`}
            onClick={() => setSelectedSchool("Absurdism")}
          >
            ☕ Absurdism
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Calculating community reputation scores...</p>
        </div>
      ) : (
        <>
          {/* Top 3 Visual Podiums */}
          {topThree.length > 0 && (
            <div className="podiums-container">
              {/* 2nd Place Silver */}
              {topThree[1] && (
                <div className="podium-card rank-2">
                  <div className="podium-rank-badge">🥈 2nd</div>
                  <img
                    src={topThree[1].user.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"}
                    alt={topThree[1].user.name || topThree[1].user.username || "Thinker"}
                    className="podium-avatar"
                  />
                  <h3 className="podium-name">{topThree[1].user.name || topThree[1].user.username}</h3>
                  <span className="podium-school">{topThree[1].primarySchool}</span>

                  <div className="rep-score-chip">
                    ⚡ {topThree[1].reputationPoints.toLocaleString()} Rep
                  </div>

                  <div className="podium-badges-row">
                    {topThree[1].badges.map((b) => (
                      <span key={b.id} className="badge-pill-sm" title={b.description}>
                        {b.icon}
                      </span>
                    ))}
                  </div>

                  {onOpenDM && topThree[1]?.user && (
                    <button
                      className="btn-dm-podium"
                      onClick={() => onOpenDM(topThree[1]!.user)}
                    >
                      💬 DM
                    </button>
                  )}
                </div>
              )}

              {/* 1st Place Gold */}
              {topThree[0] && (
                <div className="podium-card rank-1">
                  <div className="podium-crown">👑</div>
                  <div className="podium-rank-badge gold-badge">🥇 1st Place</div>
                  <img
                    src={topThree[0].user.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"}
                    alt={topThree[0].user.name || topThree[0].user.username || "Thinker"}
                    className="podium-avatar rank-1-avatar"
                  />
                  <h3 className="podium-name">{topThree[0].user.name || topThree[0].user.username}</h3>
                  <span className="podium-school">{topThree[0].primarySchool}</span>

                  <div className="rep-score-chip gold-rep">
                    ⚡ {topThree[0].reputationPoints.toLocaleString()} Rep
                  </div>

                  <div className="podium-badges-row">
                    {topThree[0].badges.map((b) => (
                      <span key={b.id} className="badge-pill-sm" title={b.description}>
                        {b.icon}
                      </span>
                    ))}
                  </div>

                  {onOpenDM && topThree[0]?.user && (
                    <button
                      className="btn-dm-podium gold-btn"
                      onClick={() => onOpenDM(topThree[0]!.user)}
                    >
                      💬 DM Champion
                    </button>
                  )}
                </div>
              )}

              {/* 3rd Place Bronze */}
              {topThree[2] && (
                <div className="podium-card rank-3">
                  <div className="podium-rank-badge">🥉 3rd</div>
                  <img
                    src={topThree[2].user.avatar || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"}
                    alt={topThree[2].user.name || topThree[2].user.username || "Thinker"}
                    className="podium-avatar"
                  />
                  <h3 className="podium-name">{topThree[2].user.name || topThree[2].user.username}</h3>
                  <span className="podium-school">{topThree[2].primarySchool}</span>

                  <div className="rep-score-chip">
                    ⚡ {topThree[2].reputationPoints.toLocaleString()} Rep
                  </div>

                  <div className="podium-badges-row">
                    {topThree[2].badges.map((b) => (
                      <span key={b.id} className="badge-pill-sm" title={b.description}>
                        {b.icon}
                      </span>
                    ))}
                  </div>

                  {onOpenDM && topThree[2]?.user && (
                    <button
                      className="btn-dm-podium"
                      onClick={() => onOpenDM(topThree[2]!.user)}
                    >
                      💬 DM
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Full Rankings Table */}
          <div className="leaderboard-table-card">
            <h3 className="section-title">📊 Complete Community Rankings</h3>
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
                        <div className="user-info-group">
                          <img
                            src={entry.user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
                            alt={entry.user.name || entry.user.username || "User"}
                            className="table-avatar"
                          />
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
                        <span className="rep-badge">⚡ {entry.reputationPoints.toLocaleString()}</span>
                      </td>

                      <td className="action-cell">
                        {onOpenDM && (
                          <button
                            className="table-dm-btn"
                            onClick={() => onOpenDM(entry.user)}
                          >
                            💬 DM
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
            <h3 className="section-title">🏆 Platform Achievement Badges</h3>
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
                      <span className="badge-status-unlocked">✓ Unlocked</span>
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
