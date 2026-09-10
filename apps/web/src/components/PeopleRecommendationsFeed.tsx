import React, { useState, useEffect } from "react";
import type { User, UserRecommendation, ConnectionIntent } from "@agora-server/contract";
import { agoraClient } from "../lib/api-client.js";
import { DualAxisCompatibilityGauge } from "./DualAxisCompatibilityGauge.js";

const INTENT_FILTERS: { id: ConnectionIntent | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All Connections", icon: "🌐" },
  { id: "discussion", label: "Discussions", icon: "💬" },
  { id: "intellectual", label: "Intellectual", icon: "🧠" },
  { id: "friendship", label: "Friendship", icon: "🤝" },
  { id: "dating", label: "Dating", icon: "❤️" },
];

export interface PeopleRecommendationsFeedProps {
  onOpenDM?: (user: User) => void;
}

export const PeopleRecommendationsFeed: React.FC<PeopleRecommendationsFeedProps> = ({ onOpenDM }) => {
  const [recommendations, setRecommendations] = useState<UserRecommendation[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<ConnectionIntent | "all">("all");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [thinkerFilter, setThinkerFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await agoraClient.getPeopleRecommendations({
        connectionIntent: selectedIntent === "all" ? undefined : selectedIntent,
        school: schoolFilter || undefined,
        thinker: thinkerFilter || undefined,
        limit: 10,
      });
      setRecommendations(res.recommendations);
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

  return (
    <div className="recommendations-feed-container">
      <div className="feed-header">
        <h2>🤝 Intellectual Connections & Compatibility Recommendations</h2>
        <p className="feed-subtitle">
          Discover thinkers based on dual-axis compatibility: shared ground + productive philosophical tension.
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
                <div className="card-actions">
                  <button
                    className="connect-btn"
                    onClick={() => onOpenDM && onOpenDM(user)}
                  >
                    💬 Direct Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

