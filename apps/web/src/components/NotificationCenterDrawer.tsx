import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient, type PhilosophyNotification, type ConnectionRequest } from "../lib/api-client.js";

export interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
  onOpenDM?: (targetUser: User) => void;
  onOpenThreadDrawer?: (postId: string, commentId?: string, replyId?: string) => void;
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
        agoraClient.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 })),
        agoraClient.getConnectionRequests().catch(() => ({ requests: [] })),
      ]);
      const safeNotifs = Array.isArray(notifRes?.notifications) ? notifRes.notifications : [];
      const safeUnread = typeof notifRes?.unreadCount === "number" ? notifRes.unreadCount : 0;
      const safeReqs = Array.isArray(reqRes?.requests) ? reqRes.requests : [];

      setNotifications(safeNotifs);
      setUnreadCount(safeUnread);
      onUnreadCountChange?.(safeUnread);
      setConnectionRequests(safeReqs);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
      setConnectionRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotificationsData();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleNotifUpdate = () => {
      loadNotificationsData();
    };
    window.addEventListener("agora_comment_added", handleNotifUpdate);
    window.addEventListener("agora_notification_updated", handleNotifUpdate);
    return () => {
      window.removeEventListener("agora_comment_added", handleNotifUpdate);
      window.removeEventListener("agora_notification_updated", handleNotifUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const handleMarkSingleRead = async (notificationId: string) => {
    try {
      await agoraClient.markSingleNotificationRead(notificationId);
      setNotifications((prev) => (Array.isArray(prev) ? prev : []).map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await agoraClient.markNotificationsRead();
      setNotifications((prev) => (Array.isArray(prev) ? prev : []).map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await agoraClient.acceptConnectionRequest(requestId);
      setConnectionRequests((prev) =>
        (Array.isArray(prev) ? prev : []).map((r) => (r.id === requestId ? { ...r, status: "accepted" } : r))
      );
      setNotifications((prev) =>
        (Array.isArray(prev) ? prev : []).map((n) => (n.requestId === requestId ? { ...n, read: true } : n))
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
        (Array.isArray(prev) ? prev : []).map((r) => (r.id === requestId ? { ...r, status: "declined" } : r))
      );
      setNotifications((prev) =>
        (Array.isArray(prev) ? prev : []).map((n) => (n.requestId === requestId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Decline request failed:", err);
    }
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const activeNotifications = safeNotifications.filter((n) => !n.read);
  const safeRequests = Array.isArray(connectionRequests) ? connectionRequests : [];
  const pendingRequests = safeRequests.filter((r) => r?.status === "pending");

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
              {activeNotifications.length === 0 ? (
                <div className="empty-state">No unread activity notifications.</div>
              ) : (
                activeNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notification-item-card ${notif.read ? "read" : "unread"}`}
                  >
                    <div className="notif-top-bar">
                      <h4 className="notif-title">{notif.title}</h4>
                      <div className="notif-top-right">
                        <span className="notif-time">{notif.createdAt}</span>
                        <button
                          type="button"
                          className="dismiss-notif-btn"
                          title="Mark as read & dismiss"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkSingleRead(notif.id);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <p className="notif-message">{notif.message}</p>

                    {/* Inline Actions based on type */}
                    {notif.type === "connection_request" && notif.requestId && (
                      <div className="notif-inline-actions">
                        {safeRequests.find((r) => r.id === notif.requestId)?.status === "accepted" ? (
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
                          handleMarkSingleRead(notif.id);
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
                            handleMarkSingleRead(notif.id);
                            onClose();
                            onOpenThreadDrawer(notif.entityId!, notif.commentId, notif.replyId);
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
