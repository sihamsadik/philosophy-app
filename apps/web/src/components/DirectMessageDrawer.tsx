import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import type { DirectConversation, ChatMessage } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";

export interface DirectMessageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
  activeConversationId?: string | null;
}

export const DirectMessageDrawer: React.FC<DirectMessageDrawerProps> = ({
  isOpen,
  onClose,
  targetUser,
  activeConversationId,
}) => {
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations on open or targetUser change
  useEffect(() => {
    if (!isOpen) return;

    const loadConversations = async () => {
      setIsLoading(true);
      try {
        const { conversations: list } = await agoraClient.getConversations();
        setConversations(list);

        if (targetUser) {
          // Find or create direct conversation with target user
          const conv = await agoraClient.createDirectConversation(targetUser.id, targetUser);
          setSelectedConv(conv);
          // Refresh list
          const { conversations: updatedList } = await agoraClient.getConversations();
          setConversations(updatedList);
        } else if (activeConversationId) {
          const matched = list.find((c) => c.id === activeConversationId);
          if (matched) setSelectedConv(matched);
          else setSelectedConv(list[0] || null);
        } else {
          setSelectedConv(list[0] || null);
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [isOpen, targetUser, activeConversationId]);


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

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedConv) return;

    const content = inputMessage.trim();
    setInputMessage("");

    try {
      const newMsg = await agoraClient.sendMessage(selectedConv.id, content);
      setMessages((prev) => [...prev, newMsg]);

      // Update conversation last message in local state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id
            ? { ...c, lastMessage: content, lastMessageTime: "Just now" }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="dm-drawer-pane" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="header-title-block">
            <h3>💬 Direct Messages</h3>
            <span className="drawer-subtitle">
              Engage in one-on-one philosophical dialogue & debate
            </span>
          </div>
          <button className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="dm-body">
          {/* Sidebar: Conversation List */}
          <div className="dm-sidebar">
            <h4 className="dm-sidebar-heading">Conversations</h4>
            {isLoading ? (
              <div className="loading-state">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="empty-state">No direct messages yet</div>
            ) : (
              <div className="conversations-list">
                {conversations.map((conv) => {
                  const isActive = selectedConv?.id === conv.id;
                  const p = conv.participant;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      className={`conv-item-btn ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedConv(conv)}
                    >
                      {p.avatar ? (
                        <img src={p.avatar} alt="Avatar" className="conv-avatar-img" />
                      ) : (
                        <div className="conv-avatar-circle">
                          {(p.name || p.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="conv-details">
                        <div className="conv-top-row">
                          <span className="conv-name">{p.name || p.username}</span>
                          <span className="conv-time">{conv.lastMessageTime}</span>
                        </div>
                        <p className="conv-preview">{conv.lastMessage || "No messages yet"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main: Message History & Input */}
          <div className="dm-chat-pane">
            {selectedConv ? (
              <>
                {/* Chat Partner Bar */}
                <div className="chat-partner-bar">
                  {selectedConv.participant.avatar ? (
                    <img
                      src={selectedConv.participant.avatar}
                      alt="Avatar"
                      className="partner-avatar"
                    />
                  ) : (
                    <div className="partner-circle">
                      {(selectedConv.participant.name || selectedConv.participant.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="partner-name">
                      {selectedConv.participant.name || selectedConv.participant.username}
                    </span>
                    <span className="partner-handle">
                      @{selectedConv.participant.username || "philosopher"}
                    </span>
                  </div>
                </div>

                {/* Message Stream */}
                <div className="messages-stream">
                  {messages.length === 0 ? (
                    <div className="empty-chat-state">
                      <p>📜 Start a philosophical discussion with {selectedConv.participant.name}!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === "00000000-0000-0000-0000-000000000001";
                      return (
                        <div
                          key={msg.id}
                          className={`message-bubble-wrapper ${isMe ? "me" : "them"}`}
                        >
                          <div className="message-bubble">
                            <span className="message-sender">
                              {isMe ? "You" : msg.senderName || selectedConv.participant.name}
                            </span>
                            <p className="message-text">{msg.content}</p>
                            <span className="message-time">{msg.createdAt}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendMessage} className="chat-input-bar">
                  <input
                    type="text"
                    className="input-text"
                    placeholder={`Message ${selectedConv.participant.name}...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                  />
                  <button type="submit" className="add-btn" disabled={!inputMessage.trim()}>
                    Send 💬
                  </button>
                </form>
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
