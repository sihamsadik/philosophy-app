import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient, type PhilosophyNotification, type ConnectionRequest } from "../lib/api-client.js";

export interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
  onOpenDM?: (targetUser: User) => void;
  onOpenThreadDrawer?: (postId: string) => void;
}

export const NotificationCenterDrawer: React.FC<NotificationCenterDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
  onOpenDM,
  onOpenThreadDrawer,
}) => {
  const [notifications, setNotifications] = useState<PhilosophyNotification[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "requests">("all");

  const loadNotificationsData = async () => {
    setIsLoading(true);
    try {
      const [notifRes, reqRes] = await Promise.all([
        agoraClient.getNotifications(),
        agoraClient.getConnectionRequests(),
      ]);
      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);
      onUnreadCountChange?.(notifRes.unreadCount);
      setConnectionRequests(reqRes.requests);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotificationsData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      await agoraClient.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await agoraClient.acceptConnectionRequest(requestId);
      setConnectionRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "accepted" } : r))
      );
      setNotifications((prev) =>
        prev.map((n) => (n.requestId === requestId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Accept request failed:", err);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await agoraClient.declineConnectionRequest(requestId);
      setConnectionRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "declined" } : r))
      );
      setNotifications((prev) =>
        prev.map((n) => (n.requestId === requestId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Decline request failed:", err);
    }
  };

  const pendingRequests = connectionRequests.filter((r) => r.status === "pending");

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content-pane notifications-drawer-pane" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="header-title-block">
            <h3>🔔 Real-Time Notification Center</h3>
            <p className="drawer-subtitle">
              Connection invites, direct messages, upvotes, and thread rebuttals
            </p>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Toolbar & Tabs */}
        <div className="notifications-toolbar">
          <div className="notifications-tabs">
            <button
              type="button"
              className={`notif-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Activity {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
            </button>

            <button
              type="button"
              className={`notif-tab-btn ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              🤝 Connection Invites {pendingRequests.length > 0 && (
                <span className="unread-badge pending">{pendingRequests.length}</span>
              )}
            </button>
          </div>

          <button type="button" className="action-btn-sm" onClick={handleMarkAllRead}>
            ✓ Mark All as Read
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-body notifications-body">
          {isLoading ? (
            <div className="loading-state">Loading notifications...</div>
          ) : activeTab === "requests" ? (
            /* CONNECTION REQUESTS TAB */
            <div className="requests-list">
              {pendingRequests.length === 0 ? (
                <div className="empty-state">No pending connection requests.</div>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.id} className="connection-request-card">
                    <div className="req-header-row">
                      <div className="author-identity">
                        {req.sender.avatar ? (
                          <img src={req.sender.avatar} alt="Avatar" className="author-avatar-img-sm" />
                        ) : (
                          <div className="author-avatar-circle-sm">
                            {(req.sender.name || req.sender.username || "P").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="author-name-text">{req.sender.name || req.sender.username}</span>
                          <span className="author-handle-text">@{req.sender.username}</span>
                        </div>
                      </div>
                      <span className="req-time">{req.createdAt}</span>
                    </div>

                    {req.message && <p className="req-intro-note">"{req.message}"</p>}

                    <div className="req-actions-row">
                      <button
                        type="button"
                        className="accept-req-btn"
                        onClick={() => handleAcceptRequest(req.id)}
                      >
                        🟢 Accept Connection
                      </button>
                      <button
                        type="button"
                        className="decline-req-btn"
                        onClick={() => handleDeclineRequest(req.id)}
                      >
                        🔴 Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* ALL ACTIVITY NOTIFICATIONS TAB */
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="empty-state">No activity notifications yet.</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notification-item-card ${notif.read ? "read" : "unread"}`}
                  >
                    <div className="notif-top-bar">
                      <h4 className="notif-title">{notif.title}</h4>
                      <span className="notif-time">{notif.createdAt}</span>
                    </div>

                    <p className="notif-message">{notif.message}</p>

                    {/* Inline Actions based on type */}
                    {notif.type === "connection_request" && notif.requestId && (
                      <div className="notif-inline-actions">
                        {connectionRequests.find((r) => r.id === notif.requestId)?.status === "accepted" ? (
                          <span className="status-accepted-chip">✓ Connection Accepted</span>
                        ) : connectionRequests.find((r) => r.id === notif.requestId)?.status === "declined" ? (
                          <span className="status-declined-chip">✕ Request Declined</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="accept-req-btn-sm"
                              onClick={() => handleAcceptRequest(notif.requestId!)}
                            >
                              🟢 Accept
                            </button>
                            <button
                              type="button"
                              className="decline-req-btn-sm"
                              onClick={() => handleDeclineRequest(notif.requestId!)}
                            >
                              🔴 Decline
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {notif.type === "direct_message" && notif.sender && onOpenDM && (
                      <button
                        type="button"
                        className="action-btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={() => {
                          onClose();
                          onOpenDM(notif.sender!);
                        }}
                      >
                        💬 Reply in DMs
                      </button>
                    )}

                    {(notif.type === "comment_reply" || notif.type === "post_upvote") &&
                      notif.entityId &&
                      onOpenThreadDrawer && (
                        <button
                          type="button"
                          className="action-btn-sm"
                          style={{ marginTop: 8 }}
                          onClick={() => {
                            onClose();
                            onOpenThreadDrawer(notif.entityId!);
                          }}
                        >
                          📜 View Debate Thread
                        </button>
                      )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
