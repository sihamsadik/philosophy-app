import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import type { Socket } from "socket.io-client";
import type { DirectConversation, ChatMessage } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";
import { useAuth } from "../context/AuthContext.js";

export interface DirectMessageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
  activeConversationId?: string | null;
  onOpenThreadDrawer?: (postId: string, commentId?: string, replyId?: string) => void;
  realtimeSocket?: Socket | null;
}

export function upsertChatMessage(messages: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  const incomingLocalId = incoming.localId || incoming.metadata?.localId;
  const index = messages.findIndex((message) => {
    if (message.id === incoming.id) return true;
    const msgLocalId = message.localId || message.metadata?.localId;
    return Boolean(incomingLocalId && msgLocalId && incomingLocalId === msgLocalId);
  });
  if (index < 0) return [...messages, incoming];
  return messages.map((message, i) => i === index ? incoming : message);
}

export function wasMessageReadByPeer(peerLastReadAt: string | null | undefined, createdAt: string): boolean {
  if (!peerLastReadAt) return false;
  const readAt = new Date(peerLastReadAt).getTime();
  const sentAt = new Date(createdAt).getTime();
  return Number.isFinite(readAt) && Number.isFinite(sentAt) && readAt >= sentAt;
}

export function openReplyActivity(
  activity: { id: string; entityId?: string; commentId?: string; replyId?: string },
  actions: {
    markRead: (id: string) => Promise<unknown>;
    close: () => void;
    openThread: (postId: string, commentId?: string, replyId?: string) => void;
  }
) {
  if (!activity.entityId || !activity.replyId) return;
  void actions.markRead(activity.id);
  actions.close();
  actions.openThread(activity.entityId, activity.commentId, activity.replyId);
}

const getDateDividerLabel = (createdAt?: string): string => {
  if (!createdAt) return "Today";
  const lower = createdAt.toLowerCase();
  if (
    lower.includes("just now") ||
    lower.includes("m ago") ||
    lower.includes("h ago") ||
    lower.includes("min ago") ||
    lower.includes("sec ago")
  ) {
    return "Today";
  }
  if (lower.includes("yesterday")) {
    return "Yesterday";
  }

  const d = new Date(createdAt);
  if (isNaN(d.getTime())) {
    return createdAt;
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return "Today";
  } else if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
};

const formatMessageTime = (createdAt?: string): string => {
  if (!createdAt) {
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  const lower = createdAt.toLowerCase().trim();
  const now = Date.now();

  if (lower.includes("just now")) {
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  if (lower.includes("m ago") || lower.includes("min ago")) {
    const mins = parseInt(lower, 10) || 5;
    return new Date(now - mins * 60 * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  if (lower.includes("h ago") || lower.includes("hour ago")) {
    const hours = parseInt(lower, 10) || 1;
    return new Date(now - hours * 3600 * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  const d = new Date(createdAt);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

export const DirectMessageDrawer: React.FC<DirectMessageDrawerProps> = ({
  isOpen,
  onClose,
  targetUser,
  activeConversationId,
  onOpenThreadDrawer,
  realtimeSocket,
}) => {
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageSection, setMessageSection] = useState<"chats" | "requests" | "replies">("chats");
  const [replyActivities, setReplyActivities] = useState<Awaited<ReturnType<typeof agoraClient.getReplyActivities>>["activities"]>([]);
  const [replyUnreadCount, setReplyUnreadCount] = useState(0);

  const activeUserId = currentUser?.id || agoraClient.getCurrentUserId() || "00000000-0000-0000-0000-000000000001";
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  const handleAcceptRequest = async () => {
    if (!selectedConv) return;
    try {
      await agoraClient.acceptMessageRequest(selectedConv.id);
      setSelectedConv((prev) => prev ? { ...prev, requestStatus: "accepted" } : null);
      setConversations((prev) => prev.map((c) => c.id === selectedConv.id ? { ...c, requestStatus: "accepted" } : c));
    } catch (err) {
      console.error("Accept request failed:", err);
    }
  };

  const handleDeclineRequest = async () => {
    if (!selectedConv) return;
    try {
      await agoraClient.declineMessageRequest(selectedConv.id);
      setSelectedConv((prev) => prev ? { ...prev, requestStatus: "declined" } : null);
      setConversations((prev) => prev.map((c) => c.id === selectedConv.id ? { ...c, requestStatus: "declined" } : c));
    } catch (err) {
      console.error("Decline request failed:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, selectedConv, isOpen]);

  const handleSelectConv = (conv: DirectConversation) => {
    setMessageSection("chats");
    setSelectedConv(conv);
    setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
    void agoraClient.markConversationRead(conv.id);
  };

  // Load conversations on open or targetUser change
  useEffect(() => {
    if (!isOpen) return;
    if (targetUser || activeConversationId) setMessageSection("chats");

    const loadConversations = async () => {
      setIsLoading(true);
      if (!targetUser && !activeConversationId) {
        setSelectedConv(null);
        setMessages([]);
      }
      try {
        const { conversations: list } = await agoraClient.getConversations();
        setConversations(list);

        let initialConv: DirectConversation | null = null;

        if (targetUser) {
          // Find or create direct conversation with target user
          const conv = await agoraClient.createDirectConversation(targetUser.id, targetUser);
          initialConv = conv;
          const { conversations: updatedList } = await agoraClient.getConversations();
          setConversations(updatedList);
        } else if (activeConversationId) {
          const matched = list.find((c) => c.id === activeConversationId);
          initialConv = matched || null;
        }

        if (initialConv) {
          setSelectedConv(initialConv);
          setConversations((prev) => prev.map((c) => c.id === initialConv!.id ? { ...c, unreadCount: 0 } : c));
          void agoraClient.markConversationRead(initialConv.id);
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [isOpen, targetUser, activeConversationId]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const loadReplies = async () => {
      const result = await agoraClient.getReplyActivities();
      if (!active) return;
      setReplyActivities(result.activities);
      setReplyUnreadCount(result.unreadCount);
    };
    void loadReplies();
    const interval = window.setInterval(loadReplies, 15000);
    window.addEventListener("agora_notification_updated", loadReplies);
    window.addEventListener("agora_comment_added", loadReplies);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("agora_notification_updated", loadReplies);
      window.removeEventListener("agora_comment_added", loadReplies);
    };
  }, [isOpen]);

  // Load messages when selected conversation changes
  useEffect(() => {
    if (!selectedConv) return;
    const fetchMessages = async () => {
      try {
        const { messages: msgs } = await agoraClient.getMessages(selectedConv.id);
        setMessages(msgs);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };
    fetchMessages();
  }, [selectedConv]);

  useEffect(() => {
    if (!realtimeSocket || !selectedConv) return;
    realtimeSocket.emit("join:conversation", { conversationId: selectedConv.id });
    return () => {
      realtimeSocket.emit("leave:conversation", { conversationId: selectedConv.id });
    };
  }, [realtimeSocket, selectedConv?.id]);

  useEffect(() => {
    const handleIncoming = (event: Event) => {
      const incoming = (event as CustomEvent<ChatMessage>).detail;
      if (!incoming) return;
      if (incoming.conversationId === selectedConv?.id) {
        setMessages((prev) => upsertChatMessage(prev, incoming));
        if (incoming.senderId !== activeUserId) void agoraClient.markConversationRead(selectedConv.id);
      }
      void agoraClient.getConversations().then(({ conversations: list }) => setConversations(list));
    };
    const handleRead = (event: Event) => {
      const receipt = (event as CustomEvent<{ conversationId: string; userId: string; lastReadAt: string }>).detail;
      if (!receipt) return;
      if (receipt.conversationId === selectedConv?.id && receipt.userId !== activeUserId) {
        setSelectedConv((previous) => previous ? { ...previous, peerLastReadAt: receipt.lastReadAt } : previous);
      }
      void agoraClient.getConversations().then(({ conversations: list }) => setConversations(list));
    };
    window.addEventListener("agora_chat_message_created", handleIncoming);
    window.addEventListener("agora_chat_conversation_read", handleRead);
    return () => {
      window.removeEventListener("agora_chat_message_created", handleIncoming);
      window.removeEventListener("agora_chat_conversation_read", handleRead);
    };
  }, [selectedConv, activeUserId]);

  // Refresh open conversations when realtime activity arrives.
  useEffect(() => {
    const handleUpdate = () => {
      agoraClient.getConversations().then(({ conversations: list }) => {
        setConversations(list);
      });
      if (selectedConv) {
        agoraClient.getMessages(selectedConv.id).then(({ messages: msgs }) => {
          setMessages(msgs);
        });
      }
    };

    window.addEventListener("agora_notification_updated", handleUpdate);
    window.addEventListener("agora_message_sent", handleUpdate);
    window.addEventListener("agora_dm_unread_updated", handleUpdate);

    return () => {
      window.removeEventListener("agora_notification_updated", handleUpdate);
      window.removeEventListener("agora_message_sent", handleUpdate);
      window.removeEventListener("agora_dm_unread_updated", handleUpdate);
    };
  }, [selectedConv]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedConv) return;

    const content = inputMessage.trim();
    setInputMessage("");

    try {
      const newMsg = await agoraClient.sendMessage(selectedConv.id, content);
      setMessages((prev) => upsertChatMessage(prev, newMsg));

      // Update conversation last message in local state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id
            ? { ...c, lastMessage: content, lastMessageTime: "Just now", unreadCount: 0 }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const selectedPartner = selectedConv?.participant || ({
    id: "usr-peer",
    name: "Philosopher Peer",
    username: "thinker",
  } as User);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="dm-drawer-pane" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="header-title-block">
            <h3>💬 Messages</h3>
            <span className="drawer-subtitle">
              {messageSection === "replies" ? "Community replies to your comments" : "🔒 End-to-end encrypted private & secure direct messages"}
            </span>
          </div>
          <button className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="dm-body">
          {/* Sidebar: Conversation List */}
          <div className="dm-sidebar">
            <h4 className="dm-sidebar-heading">{messageSection === "replies" ? "Community Replies" : messageSection === "requests" ? "Message Requests" : "Conversations"}</h4>
            <div className="message-section-tabs" role="tablist" aria-label="Message views">
              <button
                type="button"
                role="tab"
                aria-selected={messageSection === "chats"}
                className={messageSection === "chats" ? "active" : ""}
                onClick={() => setMessageSection("chats")}
              >
                Chats
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={messageSection === "requests"}
                className={messageSection === "requests" ? "active" : ""}
                onClick={() => setMessageSection("requests")}
              >
                Requests {(() => {
                  const reqCount = conversations.filter((c) => c.requestStatus === "pending" && (c.addresseeId ? c.addresseeId === activeUserId : true)).length;
                  return reqCount > 0 ? <span className="conv-unread-badge pending">{reqCount}</span> : null;
                })()}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={messageSection === "replies"}
                className={messageSection === "replies" ? "active" : ""}
                onClick={() => {
                  setMessageSection("replies");
                }}
              >
                Replies {replyUnreadCount > 0 && <span className="conv-unread-badge">{replyUnreadCount}</span>}
              </button>
            </div>
            {messageSection === "replies" ? (
              <div className="reply-activity-list">
                {replyActivities.length === 0 ? (
                  <div className="empty-state">No community replies yet.</div>
                ) : replyActivities.map((activity) => (
                  <button
                    type="button"
                    key={activity.id}
                    className={`reply-activity-item ${activity.read ? "read" : "unread"}`}
                    onClick={() => openReplyActivity(activity, {
                      markRead: (id) => agoraClient.markSingleNotificationRead(id),
                      close: onClose,
                      openThread: (postId, commentId, replyId) => onOpenThreadDrawer?.(postId, commentId, replyId),
                    })}
                  >
                    <span className="reply-activity-heading">
                      <strong>{activity.sender?.name || "A community member"}</strong> replied to your comment
                      {!activity.read && <span className="reply-unread-dot" aria-label="Unread" />}
                    </span>
                    <span className="reply-activity-content">{activity.replyContent || activity.message}</span>
                    <span className="reply-activity-context">
                      {activity.commentContent ? `In reply to: “${activity.commentContent}”` : "In your discussion"}
                      {activity.postTitle ? ` · ${activity.postTitle}` : ""}
                    </span>
                    <time className="reply-activity-time">{activity.createdAt}</time>
                  </button>
                ))}
              </div>
            ) : isLoading ? (
              <div className="loading-state">Loading chats...</div>
            ) : (() => {
              const displayList = messageSection === "requests"
                ? conversations.filter((c) => c.requestStatus === "pending")
                : conversations.filter((c) => c.requestStatus !== "pending" && c.requestStatus !== "declined");

              if (displayList.length === 0) {
                return (
                  <div className="empty-state">
                    {messageSection === "requests" ? "No message requests." : "No direct messages yet"}
                  </div>
                );
              }

              return (
                <div className="conversations-list">
                  {displayList.map((conv) => {
                    const isActive = selectedConv?.id === conv.id;
                    const p = conv.participant || ({ id: "usr-peer", name: "Philosopher Peer", username: "thinker" } as User);
                    const hasUnread = Boolean(conv.unreadCount && conv.unreadCount > 0);
                    return (
                      <button key={conv.id} type="button" className={`conv-item-btn ${isActive ? "active" : ""}`} onClick={() => handleSelectConv(conv)}>
                        {p.avatar ? <img src={p.avatar} alt="Avatar" className="conv-avatar-img" /> : (
                          <div className="conv-avatar-circle">{(p.name || p.username || "U").charAt(0).toUpperCase()}</div>
                        )}
                        <div className="conv-details">
                          <div className="conv-top-row"><span className="conv-name">{p.name || p.username}</span><span className="conv-time">{conv.lastMessageTime}</span></div>
                          <div className="conv-bottom-row"><p className="conv-preview">{conv.lastMessage || "No messages yet"}</p>{hasUnread && <span className="conv-unread-badge">{conv.unreadCount}</span>}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Main: Message History & Input */}
          <div className="dm-chat-pane">
            {messageSection === "replies" ? (
              <div className="reply-activity-empty-pane">
                <h4>Community Replies</h4>
                <p>Select a reply to open its discussion.</p>
              </div>
            ) : selectedConv ? (
              <>
                {/* Chat Partner Bar */}
                <div className="chat-partner-bar">
                  {selectedPartner.avatar ? (
                    <img
                      src={selectedPartner.avatar}
                      alt="Avatar"
                      className="partner-avatar"
                    />
                  ) : (
                    <div className="partner-circle">
                      {(selectedPartner.name || selectedPartner.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="partner-name">
                      {selectedPartner.name || selectedPartner.username}
                    </span>
                    <span className="partner-handle">
                      @{selectedPartner.username || "philosopher"}
                    </span>
                  </div>
                </div>

                {/* Message Request Approval Banner */}
                {(() => {
                  const isPending = selectedConv.requestStatus === "pending";
                  const isDeclined = selectedConv.requestStatus === "declined";
                  const isAddressee = selectedConv.addresseeId ? selectedConv.addresseeId === activeUserId : true;
                  const isRequester = selectedConv.requesterId ? selectedConv.requesterId === activeUserId : !isAddressee;

                  if (isPending && isAddressee) {
                    return (
                      <div className="message-request-banner-box">
                        <div className="req-banner-text">
                          <span className="req-badge-icon">📩</span>
                          <div>
                            <strong>Message Request from {selectedPartner.name || selectedPartner.username}</strong>
                            <p>Accept this request to continue messaging normally in a direct conversation.</p>
                          </div>
                        </div>
                        <div className="req-banner-actions">
                          <button type="button" className="accept-req-btn" onClick={handleAcceptRequest}>
                            🟢 Accept
                          </button>
                          <button type="button" className="decline-req-btn" onClick={handleDeclineRequest}>
                            🔴 Decline
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isPending && isRequester) {
                    return (
                      <div className="message-request-banner-box pending-sent">
                        <span>⏳ Message request pending approval from @{selectedPartner.username || "philosopher"}.</span>
                      </div>
                    );
                  }

                  if (isDeclined) {
                    return (
                      <div className="message-request-banner-box declined-sent">
                        <span>✕ Message request was declined. Normal messaging is not enabled.</span>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Message Stream with Date Dividers & Telegram Bubbles */}
                <div className="messages-stream">
                  {messages.length === 0 ? (
                    <div className="empty-chat-state">
                      <p>📜 Start a philosophical discussion with {selectedPartner.name}!</p>
                    </div>
                  ) : (
                    (() => {
                      let lastDateLabel = "";
                      return messages.map((msg) => {
                        const isMe =
                          msg.senderId === activeUserId ||
                          (currentUser?.id && msg.senderId === currentUser.id) ||
                          (activeUserId === "00000000-0000-0000-0000-000000000001" && msg.senderId === "00000000-0000-0000-0000-000000000001") ||
                          msg.senderId === "usr-current" ||
                          msg.senderId === "you";
                        const entityId = msg.metadata?.entityId;
                        const dateLabel = getDateDividerLabel(msg.createdAt);
                        const showDateDivider = dateLabel !== lastDateLabel;
                        if (showDateDivider) {
                          lastDateLabel = dateLabel;
                        }

                        const timeStr = formatMessageTime(msg.createdAt);
                        const wasRead = wasMessageReadByPeer(selectedConv?.peerLastReadAt, msg.createdAt);

                        return (
                          <React.Fragment key={msg.id}>
                            {showDateDivider && (
                              <div className="chat-date-divider">
                                <span>{dateLabel}</span>
                              </div>
                            )}
                            <div className={`message-bubble-wrapper ${isMe ? "me" : "them"}`}>
                              <div
                                className={`message-bubble ${
                                  isMe ? "me-bubble" : "them-bubble"
                                }`}
                              >
                                <p className="message-text" style={{ whiteSpace: "pre-wrap" }}>
                                  {msg.content}
                                </p>

                                {entityId && (
                                  <button
                                    type="button"
                                    className="action-btn-sm primary thread-jump-btn"
                                    onClick={() => {
                                      onClose();
                                      onOpenThreadDrawer?.(entityId);
                                    }}
                                  >
                                    📜 Jump to Debate Thread
                                  </button>
                                )}

                                <div className="message-content-footer">
                                  <span className="message-time">{timeStr}</span>
                                  {isMe && <span className="message-ticks" aria-label={wasRead ? "Read" : "Sent"}>
                                    {wasRead ? "✓✓" : "✓"}
                                  </span>}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      });
                    })()
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                {(() => {
                  const isPending = selectedConv.requestStatus === "pending";
                  const isDeclined = selectedConv.requestStatus === "declined";
                  const isAddressee = selectedConv.addresseeId ? selectedConv.addresseeId === activeUserId : true;
                  const isRequester = selectedConv.requesterId ? selectedConv.requesterId === activeUserId : !isAddressee;
                  const canSend = !isDeclined && !(isPending && isRequester);

                  return (
                    <form onSubmit={handleSendMessage} className="chat-input-bar">
                      <input
                        type="text"
                        className="input-text"
                        placeholder={
                          isDeclined
                            ? "Request declined."
                            : isPending && isRequester
                            ? "Waiting for response..."
                            : `Message ${selectedPartner.name || selectedPartner.username || "Philosopher"}...`
                        }
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={!canSend}
                      />
                      <button type="submit" className="add-btn" disabled={!canSend || !inputMessage.trim()}>
                        Send 💬
                      </button>
                    </form>
                  );
                })()}
              </>
            ) : (
              <div className="no-chat-selected">
                <p>Select a conversation to view messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
