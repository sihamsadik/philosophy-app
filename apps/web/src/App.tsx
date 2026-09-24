import React, { useState } from "react";
import { io, type Socket } from "socket.io-client";
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
import { PwaInstallModal } from "./components/PwaInstallModal.js";
import { MomentsCarousel } from "./components/MomentsCarousel.js";
import { LiveTextDebateModal } from "./components/LiveTextDebateModal.js";
import { LiveEventJoinModal } from "./components/LiveEventJoinModal.js";
import { PublicLandingDashboard } from "./components/PublicLandingDashboard.js";
import { BottomNavDock, type NavTab as BottomNavTab } from "./components/BottomNavDock.js";
import { agoraClient } from "./lib/api-client.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";

type NavTab = "profile" | "recommendations" | "search" | "debates" | "spaces" | "symposiums" | "leaderboard";

export const App: React.FC = () => {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>("debates");
  const [activeDrawerEntityId, setActiveDrawerEntityId] = useState<string | null>(null);
  const [activeThreadPostId, setActiveThreadPostId] = useState<string | null>(null);
  const [activeThreadTargetCommentId, setActiveThreadTargetCommentId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"signin" | "signup">("signin");
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUserMenuDropdownOpen, setIsUserMenuDropdownOpen] = useState(false);

  // Live Text Debate Modal for Story Circles
  const [liveDebateThinker, setLiveDebateThinker] = useState<User | null>(null);

  // DM Drawer, Composer & Event Modals
  const [isDMDrawerOpen, setIsDMDrawerOpen] = useState(false);
  const [dmTargetUser, setDmTargetUser] = useState<User | null>(null);
  const [isPostComposerOpen, setIsPostComposerOpen] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [composerSpaceId, setComposerSpaceId] = useState<string | undefined>(undefined);
  const [isEventComposerOpen, setIsEventComposerOpen] = useState(false);
  const [lastCreatedEvent, setLastCreatedEvent] = useState<any | null>(null);
  const [selectedLiveEvent, setSelectedLiveEvent] = useState<any | null>(null);

  // Notification Drawer & Connection Request Modal
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const [realtimeSocket, setRealtimeSocket] = useState<Socket | null>(null);
  const [connectTargetUser, setConnectTargetUser] = useState<User | null>(null);

  const refreshNotifCount = React.useCallback(async () => {
    try {
      const res = await agoraClient.getNotifications();
      setUnreadNotifCount(res.unreadCount);
    } catch {
      setUnreadNotifCount(0);
    }
  }, []);

  const refreshDmUnreadCount = React.useCallback(async () => {
    try {
      setUnreadDmCount(await agoraClient.getUnreadMessageCount());
    } catch {
      setUnreadDmCount(0);
    }
  }, []);

  React.useEffect(() => {
    refreshNotifCount();
    refreshDmUnreadCount();

    const handleNotifUpdate = () => refreshNotifCount();
    const handleDmUpdate = () => refreshDmUnreadCount();

    window.addEventListener("agora_notification_updated", handleNotifUpdate);
    window.addEventListener("agora_comment_added", handleNotifUpdate);
    window.addEventListener("agora_message_sent", handleDmUpdate);
    window.addEventListener("agora_dm_unread_updated", handleDmUpdate);

    // Poll every 15s to update unread badges when background activity occurs
    const interval = setInterval(() => {
      refreshNotifCount();
    }, 15000);

    return () => {
      window.removeEventListener("agora_notification_updated", handleNotifUpdate);
      window.removeEventListener("agora_comment_added", handleNotifUpdate);
      window.removeEventListener("agora_message_sent", handleDmUpdate);
      window.removeEventListener("agora_dm_unread_updated", handleDmUpdate);
      clearInterval(interval);
    };
  }, [refreshNotifCount, refreshDmUnreadCount, user?.id, isAuthenticated]);

  React.useEffect(() => {
    const token = agoraClient.getAuthToken();
    if (!isAuthenticated || !token) {
      setRealtimeSocket(null);
      return;
    }
    const socket = io(window.location.origin, {
      auth: { token },
      query: { projectId: agoraClient.getProjectId() },
      transports: ["websocket", "polling"],
    });
    const handleMessage = (raw: any) => {
      const message = {
        ...raw,
        senderId: raw.userId || raw.senderId,
        senderName: raw.user?.name || raw.user?.username || "Philosopher",
        senderAvatar: raw.user?.avatar,
      };
      window.dispatchEvent(new CustomEvent("agora_chat_message_created", { detail: message }));
      void refreshDmUnreadCount();
    };
    const handleRead = (receipt: { conversationId: string; userId: string; lastReadAt: string }) => {
      window.dispatchEvent(new CustomEvent("agora_chat_conversation_read", { detail: receipt }));
    };
    const handleConversation = () => void refreshDmUnreadCount();
    socket.on("connect", refreshDmUnreadCount);
    socket.on("message:created", handleMessage);
    socket.on("conversation:read", handleRead);
    socket.on("conversation:created", handleConversation);
    setRealtimeSocket(socket);
    return () => {
      socket.disconnect();
      setRealtimeSocket(null);
    };
  }, [isAuthenticated, user?.id, refreshDmUnreadCount]);


  const [liveDebateEvent, setLiveDebateEvent] = useState<any | null>(null);

  const handleOpenDM = (targetUser?: User | null) => {
    setDmTargetUser(targetUser || null);
    setIsDMDrawerOpen(true);
  };

  const handleTriggerPwaInstall = async () => {
    const activePrompt = (window as any).deferredPwaPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          (window as any).deferredPwaPrompt = null;
          setIsPwaModalOpen(false);
          return;
        }
      } catch (err) {
        console.error("Native PWA prompt error:", err);
      }
    }
    setIsPwaModalOpen(true);
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
            className="top-action-circle-btn"
            onClick={handleTriggerPwaInstall}
            title="Install App (PWA)"
            style={{ fontSize: "0.9rem" }}
          >
            📲
          </button>

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
            className="top-action-circle-btn notif-btn"
            onClick={() => handleOpenDM(null)}
            title="Direct Messages"
          >
            💬
            {unreadDmCount > 0 && <span className="top-notif-badge">{unreadDmCount}</span>}
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
            <div className="auth-header-action-group" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="connect-btn-sm"
                onClick={() => {
                  setAuthModalMode("signin");
                  setIsAuthModalOpen(true);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className="connect-btn-sm primary-signup-btn"
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "#ffffff",
                  borderRadius: 20,
                  border: "none",
                  padding: "6px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                }}
                onClick={() => {
                  setAuthModalMode("signup");
                  setIsAuthModalOpen(true);
                }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Thinker Moments / Stories Carousel Bar */}
      <MomentsCarousel
        currentUser={user}
        onOpenComposer={() => setIsEventComposerOpen(true)}
        onSelectThinker={(thinker) => setLiveDebateThinker(thinker)}
        onSelectEvent={(event) => setSelectedLiveEvent(event)}
        lastCreatedEvent={lastCreatedEvent}
      />

      {/* Main Content Area */}
      <main className="app-main-content">
        <ErrorBoundary fallbackTitle="Philosophical Feed Recovered">
          {!isAuthenticated || !user ? (
            <PublicLandingDashboard
              onOpenAuth={(mode) => {
                setAuthModalMode(mode);
                setIsAuthModalOpen(true);
              }}
            />
          ) : (
            <>
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
                  lastCreatedEvent={lastCreatedEvent}
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
                  key={feedRefreshKey}
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
                  user={user}
                  onSaveSuccess={() => refreshUser()}
                />
              )}

              {activeTab === "search" && <SemanticSearch />}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* Fixed Bottom Navigation Dock (Shown for authenticated users) */}
      {isAuthenticated && user && (
        <BottomNavDock
          activeTab={activeTab as BottomNavTab}
          onTabChange={(tab) => setActiveTab(tab as NavTab)}
          unreadNotifCount={unreadNotifCount}
        />
      )}

      {/* Floating PWA Install App Banner (Positioned above bottom dock) */}
      <InstallAppBanner />

      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        deferredPrompt={null}
        onTriggerInstall={() => {}}
      />

      {/* Modals & Drawers */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setActiveTab("debates")}
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
        onPostPublished={() => {
          setFeedRefreshKey((prev) => prev + 1);
        }}
      />

      <DirectMessageDrawer
        isOpen={isDMDrawerOpen}
        onClose={() => setIsDMDrawerOpen(false)}
        targetUser={dmTargetUser}
        onOpenThreadDrawer={(postId, commentId, replyId) => {
          setActiveThreadPostId(postId);
          setActiveThreadTargetCommentId(replyId || commentId || null);
        }}
        realtimeSocket={realtimeSocket}
      />

      <DebateSummaryDrawer
        entityId={activeDrawerEntityId || ""}
        isOpen={!!activeDrawerEntityId}
        onClose={() => setActiveDrawerEntityId(null)}
      />

      <DebateThreadDrawer
        isOpen={!!activeThreadPostId}
        onClose={() => {
          setActiveThreadPostId(null);
          setActiveThreadTargetCommentId(null);
        }}
        postId={activeThreadPostId}
        targetCommentId={activeThreadTargetCommentId}
        onOpenDebateSummary={(postId) => setActiveDrawerEntityId(postId)}
      />

      <NotificationCenterDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onUnreadCountChange={(count) => setUnreadNotifCount(count)}
        onOpenDM={(targetUser) => handleOpenDM(targetUser)}
        onOpenThreadDrawer={(postId, commentId, replyId) => {
          setActiveThreadPostId(postId);
          setActiveThreadTargetCommentId(replyId || commentId || null);
        }}
      />

      <ConnectionRequestModal
        isOpen={!!connectTargetUser}
        onClose={() => setConnectTargetUser(null)}
        targetUser={connectTargetUser}
      />

      <EventComposerModal
        isOpen={isEventComposerOpen}
        onClose={() => setIsEventComposerOpen(false)}
        onCreated={(newEvent) => {
          setLastCreatedEvent(newEvent);
          setActiveTab("symposiums");
        }}
      />

      <LiveEventJoinModal
        isOpen={!!selectedLiveEvent}
        onClose={() => setSelectedLiveEvent(null)}
        event={selectedLiveEvent}
        onOpenDM={(targetUser) => handleOpenDM(targetUser)}
        onOpenTextDebate={(hostUser, evt) => {
          setLiveDebateThinker(hostUser);
          setLiveDebateEvent(evt || selectedLiveEvent);
        }}
      />

      {/* Live Text Debate / Moment Modal for Story Circles */}
      <LiveTextDebateModal
        isOpen={!!liveDebateThinker}
        onClose={() => {
          setLiveDebateThinker(null);
          setLiveDebateEvent(null);
        }}
        thinker={liveDebateThinker}
        event={liveDebateEvent}
      />

      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        deferredPrompt={(window as any).deferredPwaPrompt}
        onTriggerInstall={handleTriggerPwaInstall}
      />
    </div>
  );
};

export default App;
