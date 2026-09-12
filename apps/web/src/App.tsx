import React, { useState } from "react";
import type { User } from "@philosophy/contract";
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
import { InstallAppBanner } from "./components/InstallAppBanner.js";
import { MomentsCarousel } from "./components/MomentsCarousel.js";
import { LiveTextDebateModal } from "./components/LiveTextDebateModal.js";
import { BottomNavDock, type NavTab as BottomNavTab } from "./components/BottomNavDock.js";
import { agoraClient } from "./lib/api-client.js";

type NavTab = "profile" | "recommendations" | "search" | "debates" | "spaces" | "symposiums" | "leaderboard";

export const App: React.FC = () => {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>("debates");
  const [activeDrawerEntityId, setActiveDrawerEntityId] = useState<string | null>(null);
  const [activeThreadPostId, setActiveThreadPostId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUserMenuDropdownOpen, setIsUserMenuDropdownOpen] = useState(false);

  // Live Text Debate Modal for Story Circles
  const [liveDebateThinker, setLiveDebateThinker] = useState<User | null>(null);

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
      {/* Mobile & Desktop Header Bar (Inspired by Telegram / Rize App Screenshot) */}
      <header className="app-top-header">
        <div className="top-header-left">
          <button
            type="button"
            className="top-action-circle-btn"
            onClick={() => {
              setComposerSpaceId(undefined);
              setIsPostComposerOpen(true);
            }}
            title="Create Post / Argument"
          >
            +
          </button>
        </div>

        <div className="top-header-center" onClick={() => setActiveTab("debates")}>
          <span className="brand-logo-text">agora</span>
        </div>

        <div className="top-header-right">
          <button
            type="button"
            className="top-action-circle-btn notif-btn"
            onClick={() => setIsNotifDrawerOpen(true)}
            title="Notification Center"
          >
            🔔
            {unreadNotifCount > 0 && <span className="top-notif-badge">{unreadNotifCount}</span>}
          </button>

          <button
            type="button"
            className="top-action-circle-btn"
            onClick={() => handleOpenDM(null)}
            title="Direct Messages"
          >
            💬
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
            <button className="connect-btn-sm" onClick={() => setIsAuthModalOpen(true)}>
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Thinker Moments / Stories Carousel Bar */}
      <MomentsCarousel
        currentUser={user}
        onOpenComposer={() => {
          setComposerSpaceId(undefined);
          setIsPostComposerOpen(true);
        }}
        onSelectThinker={(thinker) => setLiveDebateThinker(thinker)}
      />

      {/* Main Content Area */}
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
            onOpenTextDebate={(hostUser) => setLiveDebateThinker(hostUser)}
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

      {/* Fixed Bottom Navigation Dock (Responsive Mobile & Desktop Bar) */}
      <BottomNavDock
        activeTab={activeTab as BottomNavTab}
        onTabChange={(tab) => setActiveTab(tab as NavTab)}
        unreadNotifCount={unreadNotifCount}
      />

      {/* Floating PWA Install App Banner (Positioned above bottom dock) */}
      <InstallAppBanner />

      {/* Modals & Drawers */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setActiveTab("profile")}
      />

      <UserSettingsModal
        user={user}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveSuccess={() => refreshUser()}
      />

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

      <DirectMessageDrawer
        isOpen={isDMDrawerOpen}
        onClose={() => setIsDMDrawerOpen(false)}
        targetUser={dmTargetUser}
      />

      <DebateSummaryDrawer
        entityId={activeDrawerEntityId || ""}
        isOpen={!!activeDrawerEntityId}
        onClose={() => setActiveDrawerEntityId(null)}
      />

      <DebateThreadDrawer
        isOpen={!!activeThreadPostId}
        onClose={() => setActiveThreadPostId(null)}
        postId={activeThreadPostId}
        onOpenDebateSummary={(postId) => setActiveDrawerEntityId(postId)}
      />

      <NotificationCenterDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onUnreadCountChange={(count) => setUnreadNotifCount(count)}
        onOpenDM={(targetUser) => handleOpenDM(targetUser)}
        onOpenThreadDrawer={(postId) => setActiveThreadPostId(postId)}
      />

      <ConnectionRequestModal
        isOpen={!!connectTargetUser}
        onClose={() => setConnectTargetUser(null)}
        targetUser={connectTargetUser}
      />

      <EventComposerModal
        isOpen={isEventComposerOpen}
        onClose={() => setIsEventComposerOpen(false)}
        onCreated={() => setActiveTab("symposiums")}
      />

      {/* Live Text Debate / Moment Modal for Story Circles */}
      <LiveTextDebateModal
        isOpen={!!liveDebateThinker}
        onClose={() => setLiveDebateThinker(null)}
        thinker={liveDebateThinker}
      />
    </div>
  );
};

export default App;
