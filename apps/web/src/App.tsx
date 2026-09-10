import React, { useState } from "react";
import { useAuth } from "./context/AuthContext.js";
import { PhilosophyProfileEditor } from "./components/PhilosophyProfileEditor.js";
import { PeopleRecommendationsFeed } from "./components/PeopleRecommendationsFeed.js";
import { SemanticSearch } from "./components/SemanticSearch.js";
import { DebateSummaryDrawer } from "./components/DebateSummaryDrawer.js";
import { AuthModal } from "./components/AuthModal.js";

import { UserSettingsModal } from "./components/UserSettingsModal.js";

type NavTab = "profile" | "recommendations" | "search" | "debates";

export const App: React.FC = () => {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>("recommendations");
  const [activeDrawerEntityId, setActiveDrawerEntityId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUserMenuDropdownOpen, setIsUserMenuDropdownOpen] = useState(false);

  const sampleDebates = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      title: "Hard Determinism vs. Compatibilism: Is Moral Agency an Illusion?",
      author: "Spinoza",
      postType: "argument",
      commentCount: 14,
      snippet: "If every physical event is determined by prior causes, how can moral responsibility exist without radical agent causation?",
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      title: "The Myth of Sisyphus: Creating Meaning in an Absurd Universe",
      author: "Albert Camus",
      postType: "thought_experiment",
      commentCount: 8,
      snippet: "One must imagine Sisyphus happy. What are the limits of radical existential freedom in the face of mortality?",
    },
  ];

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="app-navbar">
        <div className="brand-block">
          <h1 className="brand-title">🏛️ Agora Philosophy</h1>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
            Intellectual Discovery & Community Platform
          </span>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === "recommendations" ? "active" : ""}`}
            onClick={() => setActiveTab("recommendations")}
          >
            🤝 Connections
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            🧠 My Worldview
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            🔍 Concept Search
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "debates" ? "active" : ""}`}
            onClick={() => setActiveTab("debates")}
          >
            📜 Debate Summaries
          </button>
        </div>

        {/* User Auth Section */}
        <div className="navbar-user-block">
          {isAuthenticated && user ? (
            <div className="user-profile-dropdown-wrapper">
              <button
                type="button"
                className="user-profile-menu-btn"
                onClick={() => setIsUserMenuDropdownOpen(!isUserMenuDropdownOpen)}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="navbar-avatar-img" />
                ) : (
                  <div className="navbar-avatar-circle">
                    {(user.name || user.username || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="user-info">
                  <span className="user-display-name">{user.name || user.username}</span>
                  <span className="user-handle">@{user.username || "philosopher"}</span>
                </div>
                <span className="dropdown-caret">▼</span>
              </button>

              {isUserMenuDropdownOpen && (
                <div className="navbar-dropdown-menu" onClick={() => setIsUserMenuDropdownOpen(false)}>
                  <button
                    type="button"
                    className="dropdown-item-btn"
                    onClick={() => setIsSettingsModalOpen(true)}
                  >
                    ⚙️ Profile Settings & Bio
                  </button>
                  <button
                    type="button"
                    className="dropdown-item-btn"
                    onClick={() => setActiveTab("profile")}
                  >
                    🧠 My Worldview Profile
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item-btn logout"
                    onClick={() => logout()}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="connect-btn" onClick={() => setIsAuthModalOpen(true)}>
              Sign In / Register
            </button>
          )}
        </div>
      </nav>

      {/* Tab Views */}
      <main className="app-main-content">
        {activeTab === "recommendations" && <PeopleRecommendationsFeed />}

        {activeTab === "profile" && (
          <PhilosophyProfileEditor
            userId={user?.id || "00000000-0000-0000-0000-000000000001"}
            initialProfile={user?.philosophyProfile}
          />
        )}

        {activeTab === "search" && <SemanticSearch />}

        {activeTab === "debates" && (
          <div className="debates-feed-container">
            <div className="feed-header">
              <h2>📜 Philosophical Debates & AI Summaries</h2>
              <p className="feed-subtitle">
                Explore community debates and generate AI summaries of complex comment trees.
              </p>
            </div>

            <div className="debates-list">
              {sampleDebates.map((debate) => (
                <div key={debate.id} className="search-result-card">
                  <div className="result-card-header">
                    <span className="result-type-tag argument">
                      {debate.postType.toUpperCase()}
                    </span>
                    <span className="chip question-chip">
                      💬 {debate.commentCount} Comments
                    </span>
                  </div>

                  <h3 className="result-title" style={{ marginTop: 10, fontSize: "1.2rem" }}>
                    {debate.title}
                  </h3>
                  <p className="result-snippet" style={{ margin: "8px 0 16px 0" }}>
                    {debate.snippet}
                  </p>

                  <div className="card-actions">
                    <button
                      className="connect-btn"
                      onClick={() => setActiveDrawerEntityId(debate.id)}
                    >
                      🧠 Analyze AI Discussion Summary
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal Dialog */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setActiveTab("profile")}
      />

      {/* Profile Settings & Customization Modal */}
      <UserSettingsModal
        user={user}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveSuccess={() => refreshUser()}
      />

      {/* AI Debate Summary Drawer Modal */}
      <DebateSummaryDrawer
        entityId={activeDrawerEntityId || ""}
        isOpen={!!activeDrawerEntityId}
        onClose={() => setActiveDrawerEntityId(null)}
      />
    </div>
  );
};

export default App;
