import React, { useState } from "react";
import type { User } from "@agora-server/contract";
import { useAuth } from "./context/AuthContext.js";
import { PhilosophyProfileEditor } from "./components/PhilosophyProfileEditor.js";
import { PeopleRecommendationsFeed } from "./components/PeopleRecommendationsFeed.js";
import { SemanticSearch } from "./components/SemanticSearch.js";
import { DebateSummaryDrawer } from "./components/DebateSummaryDrawer.js";
import { AuthModal } from "./components/AuthModal.js";
import { UserSettingsModal } from "./components/UserSettingsModal.js";
import { DirectMessageDrawer } from "./components/DirectMessageDrawer.js";
import { PostComposerModal } from "./components/PostComposerModal.js";
import { PhilosophicalFeed } from "./components/PhilosophicalFeed.js";
import { DebateThreadDrawer } from "./components/DebateThreadDrawer.js";
import { SpacesHub } from "./components/SpacesHub.js";
import { NotificationCenterDrawer } from "./components/NotificationCenterDrawer.js";
import { ConnectionRequestModal } from "./components/ConnectionRequestModal.js";
import { SymposiumsDirectory } from "./components/SymposiumsDirectory.js";
import { EventComposerModal } from "./components/EventComposerModal.js";
import { LeaderboardHub } from "./components/LeaderboardHub.js";
import { agoraClient } from "./lib/api-client.js";

type NavTab = "profile" | "recommendations" | "search" | "debates" | "spaces" | "symposiums" | "leaderboard";

export const App: React.FC = () => {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>("spaces");
  const [activeDrawerEntityId, setActiveDrawerEntityId] = useState<string | null>(null);
  const [activeThreadPostId, setActiveThreadPostId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUserMenuDropdownOpen, setIsUserMenuDropdownOpen] = useState(false);

  // DM Drawer, Composer & Event Modals
  const [isDMDrawerOpen, setIsDMDrawerOpen] = useState(false);
  const [dmTargetUser, setDmTargetUser] = useState<User | null>(null);
  const [isPostComposerOpen, setIsPostComposerOpen] = useState(false);
  const [composerSpaceId, setComposerSpaceId] = useState<string | undefined>(undefined);
  const [isEventComposerOpen, setIsEventComposerOpen] = useState(false);

  // Notification Drawer & Connection Request Modal
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(2);
  const [connectTargetUser, setConnectTargetUser] = useState<User | null>(null);

  React.useEffect(() => {
    // Initial fetch of unread count
    agoraClient
      .getNotifications()
      .then((res) => setUnreadNotifCount(res.unreadCount))
      .catch((err) => console.error("Failed to load notification badge:", err));
  }, []);

  const handleOpenDM = (targetUser?: User | null) => {
    setDmTargetUser(targetUser || null);
    setIsDMDrawerOpen(true);
  };

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
            className={`nav-tab-btn ${activeTab === "spaces" ? "active" : ""}`}
            onClick={() => setActiveTab("spaces")}
          >
            🏛️ Spaces & Circles
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "symposiums" ? "active" : ""}`}
            onClick={() => setActiveTab("symposiums")}
          >
            📅 Symposiums & Events
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => setActiveTab("leaderboard")}
          >
            🏆 Leaderboard
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "recommendations" ? "active" : ""}`}
            onClick={() => setActiveTab("recommendations")}
          >
            🤝 Peer Discovery
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "debates" ? "active" : ""}`}
            onClick={() => setActiveTab("debates")}
          >
            📜 Philosophical Feed
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
        </div>

        {/* User Auth & Actions Section */}
        <div className="navbar-user-block">
          {/* Quick Action: Schedule Event */}
          <button
            type="button"
            className="action-btn"
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
            onClick={() => setIsEventComposerOpen(true)}
          >
            📅 Schedule Event
          </button>

          {/* Quick Action: Publish Post */}
          <button
            type="button"
            className="action-btn"
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
            onClick={() => setIsPostComposerOpen(true)}
          >
            ✍️ Post
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            className="notif-bell-btn"
            title="Notification Center"
            onClick={() => setIsNotifDrawerOpen(true)}
          >
            🔔
            {unreadNotifCount > 0 && (
              <span className="bell-badge">{unreadNotifCount}</span>
            )}
          </button>

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
                    onClick={() => handleOpenDM(null)}
                  >
                    💬 Direct Messages (DMs)
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
        {activeTab === "spaces" && (
          <SpacesHub
            onOpenDM={(targetUser) => handleOpenDM(targetUser)}
            onOpenDebateSummary={(entityId) => setActiveDrawerEntityId(entityId)}
            onOpenComposerForSpace={(space) => {
              setComposerSpaceId(space.id);
              setIsPostComposerOpen(true);
            }}
          />
        )}

        {activeTab === "symposiums" && (
          <SymposiumsDirectory
            onOpenComposer={() => setIsEventComposerOpen(true)}
            onOpenDM={(targetUser) => handleOpenDM(targetUser)}
          />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardHub onOpenDM={(targetUser) => handleOpenDM(targetUser)} />
        )}

        {activeTab === "recommendations" && (
          <PeopleRecommendationsFeed
            onOpenDM={(targetUser) => handleOpenDM(targetUser)}
            onOpenConnectModal={(targetUser) => setConnectTargetUser(targetUser)}
          />
        )}

        {activeTab === "debates" && (
          <PhilosophicalFeed
            onOpenDebateSummary={(entityId) => setActiveDrawerEntityId(entityId)}
            onOpenDM={(authorUser) => handleOpenDM(authorUser)}
            onOpenComposer={() => {
              setComposerSpaceId(undefined);
              setIsPostComposerOpen(true);
            }}
            onOpenThreadDrawer={(postId) => setActiveThreadPostId(postId)}
          />
        )}

        {activeTab === "profile" && (
          <PhilosophyProfileEditor
            userId={user?.id || "00000000-0000-0000-0000-000000000001"}
            initialProfile={user?.philosophyProfile}
          />
        )}

        {activeTab === "search" && <SemanticSearch />}
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

      {/* Post Composer Modal */}
      <PostComposerModal
        isOpen={isPostComposerOpen}
        onClose={() => {
          setIsPostComposerOpen(false);
          setComposerSpaceId(undefined);
        }}
        initialSpaceId={composerSpaceId}
        authorName={user?.name || user?.username || undefined}
        authorHandle={user?.username || undefined}
        authorAvatar={user?.avatar || undefined}
      />

      {/* Direct Messaging Drawer Modal */}
      <DirectMessageDrawer
        isOpen={isDMDrawerOpen}
        onClose={() => setIsDMDrawerOpen(false)}
        targetUser={dmTargetUser}
      />

      {/* AI Debate Summary Drawer Modal */}
      <DebateSummaryDrawer
        entityId={activeDrawerEntityId || ""}
        isOpen={!!activeDrawerEntityId}
        onClose={() => setActiveDrawerEntityId(null)}
      />

      {/* Debate Thread Drawer Modal */}
      <DebateThreadDrawer
        isOpen={!!activeThreadPostId}
        onClose={() => setActiveThreadPostId(null)}
        postId={activeThreadPostId}
        onOpenDebateSummary={(postId) => setActiveDrawerEntityId(postId)}
      />

      {/* Header Notification Center Drawer */}
      <NotificationCenterDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onUnreadCountChange={(count) => setUnreadNotifCount(count)}
        onOpenDM={(targetUser) => handleOpenDM(targetUser)}
        onOpenThreadDrawer={(postId) => setActiveThreadPostId(postId)}
      />

      {/* Connection Request Custom Intro Note Modal */}
      <ConnectionRequestModal
        isOpen={!!connectTargetUser}
        onClose={() => setConnectTargetUser(null)}
        targetUser={connectTargetUser}
      />

      {/* Event Composer Modal */}
      <EventComposerModal
        isOpen={isEventComposerOpen}
        onClose={() => setIsEventComposerOpen(false)}
        onCreated={() => setActiveTab("symposiums")}
      />
    </div>
  );
};

export default App;

