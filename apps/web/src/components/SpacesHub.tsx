import React, { useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient, type PhilosophicalSpace, type PhilosophicalPost } from "../lib/api-client.js";
import { PhilosophicalCommentsSection } from "./PhilosophicalCommentsSection.js";
import { useAuth } from "../context/AuthContext.js";

export interface SpacesHubProps {
  onOpenDM?: (user: User) => void;
  onOpenDebateSummary?: (postId: string) => void;
  onOpenComposerForSpace?: (space: PhilosophicalSpace) => void;
  onUnreadCircleStatusChange?: (hasUnread: boolean) => void;
}

export const SpacesHub: React.FC<SpacesHubProps> = ({
  onOpenDM,
  onOpenDebateSummary,
  onOpenComposerForSpace,
  onUnreadCircleStatusChange,
}) => {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<PhilosophicalSpace[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedSpace, setSelectedSpace] = useState<PhilosophicalSpace | null>(null);
  const [spacePosts, setSpacePosts] = useState<PhilosophicalPost[]>([]);
  const [spaceMembersList, setSpaceMembersList] = useState<Array<{ id: string; role: string; status: string; joinedAt: string; user: User }>>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [upvotedPostIds, setUpvotedPostIds] = useState<string[]>([]);
  const [expandedCommentsPostIds, setExpandedCommentsPostIds] = useState<string[]>([]);

  // Active view tab inside detailed space view (Default: Group Chat)
  const [spaceViewTab, setSpaceViewTab] = useState<"chat" | "feed" | "roster">("chat");
  const [error, setError] = useState<string | null>(null);

  // Group Chat state inside circle
  const [circleChatMessages, setCircleChatMessages] = useState<any[]>([]);
  const [circleChatInput, setCircleChatInput] = useState("");
  const [isCircleChatLoading, setIsCircleChatLoading] = useState(false);
  const chatStreamEndRef = React.useRef<HTMLDivElement | null>(null);

  // Create Space Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceCategory, setNewSpaceCategory] = useState<"school" | "thinker" | "domain" | "general">("school");
  const [newSpaceDesc, setNewSpaceDesc] = useState("");
  const [newSpaceSchool, setNewSpaceSchool] = useState("");
  const [newSpaceThinkers, setNewSpaceThinkers] = useState("");
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);

  // Share Circle Modal state
  const [shareTargetSpace, setShareTargetSpace] = useState<PhilosophicalSpace | null>(null);
  const [recentFriends, setRecentFriends] = useState<User[]>([]);
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    const handleSelectSpaceEvent = (e: any) => {
      const targetId = e.detail?.spaceId;
      if (targetId) {
        const match = spaces.find((s) => s.id === targetId || s.slug === targetId);
        if (match) {
          setSelectedSpace(match);
        } else {
          agoraClient
            .getSpace(targetId)
            .then(({ space }) => {
              if (space) setSelectedSpace(space);
            })
            .catch(() => {});
        }
      }
    };
    window.addEventListener("agora_select_space", handleSelectSpaceEvent);
    return () => window.removeEventListener("agora_select_space", handleSelectSpaceEvent);
  }, [spaces]);

  const handleOpenShareModal = async (space: PhilosophicalSpace) => {
    setShareTargetSpace(space);
    try {
      const { conversations: list } = await agoraClient.getConversations();
      const friends = list.map((c) => c.participant).filter(Boolean) as User[];
      setRecentFriends(
        friends.length > 0
          ? friends
          : [
              {
                id: "00000000-0000-0000-0000-000000000004",
                name: "Immanuel Kant",
                username: "kant",
                avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
              } as User,
              {
                id: "00000000-0000-0000-0000-000000000005",
                name: "Friedrich Nietzsche",
                username: "nietzsche",
                avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
              } as User,
            ]
      );
    } catch {
      setRecentFriends([]);
    }
  };

  const handleCopyCircleLink = (space: PhilosophicalSpace) => {
    const link = `https://agora.app/spaces/${space.slug || space.id}`;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(link);
    }
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleSendCircleToFriend = async (space: PhilosophicalSpace, friend: User) => {
    try {
      const conv = await agoraClient.createDirectConversation(friend.id, friend);
      const content = `Hey! Check out this circle: 🏛️ ${space.name} - ${space.description.slice(0, 80)}... https://agora.app/spaces/${space.slug || space.id}`;
      const metadata = {
        spaceId: space.id,
        spaceSlug: space.slug,
        spaceName: space.name,
        spaceDesc: space.description,
        bannerImage: space.bannerImage,
        avatarImage: space.avatarImage,
        membersCount: space.membersCount,
        postsCount: space.postsCount,
      };
      await agoraClient.sendMessage(conv.id, content, metadata);
      setShareTargetSpace(null);
      if (onOpenDM) {
        onOpenDM(friend);
      }
    } catch (err) {
      console.error("Failed to share circle to DM:", err);
    }
  };

  const fetchSpaces = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { spaces: list } = await agoraClient.getSpaces(
        activeCategory === "all" ? undefined : activeCategory
      );
      setSpaces(list);
    } catch (err: any) {
      console.error("Failed to load spaces:", err);
      setError(err.message || "Unable to fetch spaces from database");
      setSpaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, [activeCategory]);

  useEffect(() => {
    if (onUnreadCircleStatusChange) {
      const hasUnread = spaces.some((s) => s.isJoined && s.hasUnreadMessages);
      onUnreadCircleStatusChange(hasUnread);
    }
  }, [spaces, onUnreadCircleStatusChange]);

  const handleSelectSpace = (space: PhilosophicalSpace) => setSelectedSpace(space);

  // Load posts for selected space
  useEffect(() => {
    if (!selectedSpace) return;
    const fetchSpacePosts = async () => {
      setIsPostsLoading(true);
      try {
        const { posts } = await agoraClient.getPosts({ spaceId: selectedSpace.id });
        if (posts.length > 0) {
          setSpacePosts(posts);
        } else {
          // Fallback: fetch all posts and match by school or spaceId
          const { posts: allPosts } = await agoraClient.getPosts();
          const matched = allPosts.filter(
            (p) =>
              p.spaceId === selectedSpace.id ||
              p.primarySchool?.toLowerCase().includes(selectedSpace.primarySchool?.toLowerCase() || "")
          );
          setSpacePosts(matched.length > 0 ? matched : allPosts);
        }
      } catch (err) {
        console.error("Failed to load space posts:", err);
        setSpacePosts([]);
      } finally {
        setIsPostsLoading(false);
      }
    };
    fetchSpacePosts();
  }, [selectedSpace]);

  // Load Group Chat messages for selected space & listen for real-time messages across joined circles
  useEffect(() => {
    if (!selectedSpace) return;
    const fetchSpaceChat = async () => {
      setIsCircleChatLoading(true);
      try {
        const { messages: msgs } = await agoraClient.getSpaceChatMessages(selectedSpace.id);
        setCircleChatMessages(msgs);
        setSpaces((prev) => prev.map((space) => space.id === selectedSpace.id
          ? { ...space, hasUnreadMessages: false, unreadCount: 0 }
          : space));
      } catch (err) {
        console.error("Failed to load space group chat:", err);
      } finally {
        setIsCircleChatLoading(false);
      }
    };
    fetchSpaceChat();
  }, [selectedSpace]);

  useEffect(() => {
    const handleIncomingGroupMsg = (e: Event) => {
      const msg = (e as CustomEvent<any>).detail;
      if (!msg || !msg.conversationId) return;

      const msgSpaceId = msg.spaceId;
      if (!msgSpaceId) return;
      const isOwnMessage = msg.senderId === agoraClient.getCurrentUserId() || msg.userId === user?.id;

      setSpaces((prev) => {
        let updatedAny = false;
        const next = prev.map((s) => {
          if (s.id === msgSpaceId || s.slug === msgSpaceId) {
            const isCurrentlyViewing = selectedSpace?.id === s.id && spaceViewTab === "chat";
            if (!isCurrentlyViewing && s.isJoined && !isOwnMessage) {
              updatedAny = true;
              return {
                ...s,
                hasUnreadMessages: true,
                unreadCount: (s.unreadCount || 0) + 1,
              };
            }
          }
          return s;
        });

        if (updatedAny && onUnreadCircleStatusChange) {
          onUnreadCircleStatusChange(true);
        }
        return next;
      });

      if (selectedSpace?.id === msgSpaceId) {
        setCircleChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    window.addEventListener("agora_group_chat_message_created", handleIncomingGroupMsg);
    return () => window.removeEventListener("agora_group_chat_message_created", handleIncomingGroupMsg);
  }, [selectedSpace, spaceViewTab, onUnreadCircleStatusChange, user?.id]);

  // Scroll to bottom of group chat stream
  useEffect(() => {
    if (spaceViewTab === "chat") {
      chatStreamEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [circleChatMessages, spaceViewTab]);

  const handleSendGroupChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleChatInput.trim() || !selectedSpace) return;
    const text = circleChatInput.trim();
    setCircleChatInput("");

    try {
      const sentMsg = await agoraClient.sendSpaceChatMessage(selectedSpace.id, text);
      setCircleChatMessages((prev) => prev.some((message) => message.id === sentMsg.id) ? prev : [...prev, sentMsg]);
    } catch (err: any) {
      console.error("Failed to send group chat message:", err);
      alert(`Could not send group message: ${err?.message || "Server error"}`);
      setCircleChatInput(text);
    }
  };

  // Load member roster for selected space
  useEffect(() => {
    if (!selectedSpace) return;
    const fetchMembers = async () => {
      setIsMembersLoading(true);
      try {
        const { members } = await agoraClient.getSpaceMembers(selectedSpace.id);
        setSpaceMembersList(members);
      } catch (err) {
        console.error("Failed to load space members:", err);
        setSpaceMembersList([]);
      } finally {
        setIsMembersLoading(false);
      }
    };
    fetchMembers();
  }, [selectedSpace]);

  const handleJoinToggle = async (space: PhilosophicalSpace, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (space.isJoined) {
        const res = await agoraClient.leaveSpace(space.id);
        const updatedSpace = { ...res.space, isJoined: false };
        setSpaces((prev) => prev.map((s) => (s.id === space.id || s.slug === space.slug ? updatedSpace : s)));
        if (selectedSpace?.id === space.id || selectedSpace?.slug === space.slug) {
          setSelectedSpace(updatedSpace);
        }
      } else {
        const res = await agoraClient.joinSpace(space.id);
        const updatedSpace = { ...res.space, isJoined: true };
        setSpaces((prev) => prev.map((s) => (s.id === space.id || s.slug === space.slug ? updatedSpace : s)));
        if (selectedSpace?.id === space.id || selectedSpace?.slug === space.slug) {
          setSelectedSpace(updatedSpace);
        }
      }
    } catch (err: any) {
      console.error("Join/Leave space failed:", err);
      alert(`Unable to update space membership: ${err?.message || "Server error"}`);
    }
  };

  const handleSeedSpaces = async () => {
    try {
      await agoraClient.seedPhilosophySpaces();
      await fetchSpaces();
    } catch (err) {
      console.error("Failed to seed spaces:", err);
    }
  };

  const handleCreateSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim() || !newSpaceDesc.trim()) {
      alert("Please provide a name and description for your new circle.");
      return;
    }
    setIsCreatingSpace(true);
    try {
      const thinkersArray = newSpaceThinkers
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await agoraClient.createSpace({
        name: newSpaceName.trim(),
        description: newSpaceDesc.trim(),
        category: newSpaceCategory,
        primarySchool: newSpaceSchool.trim() || newSpaceName.trim(),
        keyThinkers: thinkersArray,
      });

      setSpaces((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setNewSpaceName("");
      setNewSpaceDesc("");
      setNewSpaceSchool("");
      setNewSpaceThinkers("");
      setSelectedSpace(created);
    } catch (err: any) {
      console.error("Failed to create circle:", err);
      alert(`Could not create circle: ${err?.message || "Server error"}`);
    } finally {
      setIsCreatingSpace(false);
    }
  };

  const handleUpvotePost = (postId: string) => {
    const hasUpvoted = upvotedPostIds.includes(postId);
    setUpvotedPostIds(
      hasUpvoted ? upvotedPostIds.filter((id) => id !== postId) : [...upvotedPostIds, postId]
    );

    setSpacePosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, upvotesCount: p.upvotesCount + (hasUpvoted ? -1 : 1) }
          : p
      )
    );
  };

  const toggleCommentsSection = (postId: string) => {
    setExpandedCommentsPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const filteredSpaces = spaces.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.primarySchool?.toLowerCase().includes(term) ||
      s.keyThinkers?.some((t) => t.toLowerCase().includes(term))
    );
  });

  // Calculate user worldview relevance score to prioritize matching circles (e.g. Existentialism first)
  const userSchools = (user?.philosophyProfile?.primarySchools || []).map((s) => s.toLowerCase());
  const userThinkers = (user?.philosophyProfile?.keyThinkers || []).map((t) => t.toLowerCase());

  const getRelevanceScore = (space: PhilosophicalSpace) => {
    let score = 0;
    const spaceSchool = (space.primarySchool || space.name).toLowerCase();

    // Direct match with user's selected primary schools (e.g. Existentialism)
    if (userSchools.some((school) => spaceSchool.includes(school) || school.includes(spaceSchool))) {
      score += 100;
    }

    // Overlapping key thinkers match
    if (space.keyThinkers && space.keyThinkers.length > 0) {
      for (const thinker of space.keyThinkers) {
        if (userThinkers.some((t) => thinker.toLowerCase().includes(t) || t.includes(thinker.toLowerCase()))) {
          score += 25;
        }
      }
    }

    return score;
  };

  // Group into Joined Circles and Suggested Circles (sorted by worldview match)
  const joinedCircles = filteredSpaces.filter((s) => s.isJoined);
  const unjoinedCircles = filteredSpaces.filter((s) => !s.isJoined);

  const suggestedCircles = [...unjoinedCircles].sort((a, b) => {
    const scoreA = getRelevanceScore(a);
    const scoreB = getRelevanceScore(b);
    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Worldview match comes first!
    }
    return b.membersCount - a.membersCount;
  });

  const categoryBadge = (cat: string) => {
    switch (cat) {
      case "school":
        return <span className="space-cat-badge school">🏛️ School Circle</span>;
      case "thinker":
        return <span className="space-cat-badge thinker">🧠 Thinker Guild</span>;
      case "domain":
        return <span className="space-cat-badge domain">🔍 Domain Hub</span>;
      default:
        return <span className="space-cat-badge general">🌐 General Circle</span>;
    }
  };

  const renderSpaceCard = (space: PhilosophicalSpace) => {
    const relevanceScore = getRelevanceScore(space);
    const isRecommended = relevanceScore > 0 && !space.isJoined;

    return (
      <div
        key={space.id}
        className={`space-card-item ${isRecommended ? "recommended-worldview-card" : ""} ${space.isJoined ? "joined-space-card" : ""}`}
        onClick={() => handleSelectSpace(space)}
        style={{
          border: isRecommended ? "1px solid rgba(59, 130, 246, 0.5)" : space.isJoined ? "1px solid rgba(99, 102, 241, 0.4)" : undefined,
          boxShadow: isRecommended ? "0 4px 20px rgba(59, 130, 246, 0.15)" : space.isJoined ? "0 4px 20px rgba(99, 102, 241, 0.1)" : undefined,
        }}
      >
        {/* Space Banner & Avatar */}
        <div
          className="space-card-banner"
          style={{
            backgroundImage: space.bannerImage ? `url(${space.bannerImage})` : undefined,
          }}
        >
          <div className="space-avatar-wrapper" style={{ position: "relative" }}>
            {space.avatarImage ? (
              <img src={space.avatarImage} alt="Space" className="space-avatar-img" />
            ) : (
              <div className="space-avatar-circle">
                {space.name.charAt(0).toUpperCase()}
              </div>
            )}
            {space.isJoined && space.hasUnreadMessages && (
              <span
                className="dock-badge-dot circle-avatar-dot"
                title="New message/discussion in circle"
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  border: "2px solid #0f172a",
                  boxShadow: "0 0 8px #ef4444",
                }}
              />
            )}
          </div>
        </div>

        <div className="space-card-content">
          <div className="space-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {categoryBadge(space.category)}
              {isRecommended && (
                <span
                  className="recommended-chip"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    color: "#fff",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  🎯 Worldview Match
                </span>
              )}
              {space.isJoined && space.hasUnreadMessages && (
                <span
                  className="unread-msg-chip"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#ffffff",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    boxShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
                  }}
                >
                  🔴 {space.unreadCount || 1} unread {(space.unreadCount || 1) === 1 ? "argument" : "arguments"}
                </span>
              )}
            </div>
            {space.isJoined && <span className="joined-chip">✓ Member</span>}
          </div>

          <h3 className="space-title">{space.name}</h3>
          <p className="space-desc">{space.description}</p>

          {/* Thinkers & School Tags */}
          {space.keyThinkers && space.keyThinkers.length > 0 && (
            <div className="space-thinkers-row">
              {space.keyThinkers.slice(0, 3).map((thinker, i) => (
                <span key={i} className="chip thinker-chip-sm">
                  🧠 {thinker}
                </span>
              ))}
            </div>
          )}

          {/* Footer Stats & Action Buttons */}
          <div className="space-card-footer">
            <div className="space-meta-stats">
              <span>👥 {space.membersCount.toLocaleString()} {space.membersCount === 1 ? "member" : "members"}</span>
              <span>📜 {space.postsCount} {space.postsCount === 1 ? "argument" : "arguments"}</span>
              {space.hasUnreadMessages && space.unreadCount ? (
                <span style={{ color: "#f87171", fontWeight: 700 }}>
                  🔥 {space.unreadCount} unread {space.unreadCount === 1 ? "argument" : "arguments"}
                </span>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                type="button"
                className="share-circle-btn-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.2s ease",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenShareModal(space);
                }}
                title="Share circle link or send directly to a friend in DM"
              >
                🔗 Share
              </button>

              <button
                type="button"
                className={`join-btn ${space.isJoined ? "joined" : ""}`}
                onClick={(e) => handleJoinToggle(space, e)}
              >
                {space.isJoined ? "Leave Circle" : "Join Circle"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="spaces-hub-container">
      {selectedSpace === null ? (
        /* =========================================================
           SPACES DIRECTORY GRID VIEW
           ========================================================= */
        <>
          <div className="spaces-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2>🏛️ Philosophical Spaces & Circles</h2>
              <p className="spaces-subtitle">
                Discover communities structured by Philosophical School, Key Thinker, and Domain of Inquiry.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="action-btn"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => setIsCreateModalOpen(true)}
              >
                ➕ Create Circle
              </button>

              <button type="button" className="action-btn seed-btn" onClick={handleSeedSpaces}>
                🌱 Seed Philosophy Circles
              </button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="spaces-filter-bar">
            <input
              type="text"
              className="filter-input search-space-input"
              placeholder="🔍 Search spaces by school, thinker, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="category-tabs-group">
              {[
                { id: "all", label: "All Circles" },
                { id: "school", label: "Philosophical Schools" },
                { id: "thinker", label: "Thinker Guilds" },
                { id: "domain", label: "Domains of Inquiry" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`category-tab-btn ${activeCategory === tab.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spaces Cards Grid */}
          {isLoading ? (
            <div className="loading-state">Loading philosophical spaces...</div>
          ) : error ? (
            <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: 20, margin: "16px 0", color: "#f87171", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: "1.05rem", display: "block", marginBottom: 4 }}>⚠️ Server / Database Connection Error</strong>
                <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>{error}. Unable to connect to local database.</span>
              </div>
              <button type="button" onClick={fetchSpaces} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                🔄 Retry
              </button>
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="empty-state" style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", margin: "16px 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>⭕</div>
              <h3 style={{ fontSize: "1.25rem", margin: "8px 0" }}>No Philosophical Circles Found</h3>
              <p style={{ color: "#94a3b8", maxWidth: 450, margin: "0 auto 16px auto" }}>
                {searchTerm ? `No circles matched "${searchTerm}".` : "There are no active circles in the database."}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  type="button"
                  className="action-btn"
                  style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  ➕ Create First Circle
                </button>
                <button
                  type="button"
                  className="action-btn seed-btn"
                  onClick={handleSeedSpaces}
                >
                  🌱 Seed Default Circles
                </button>
              </div>
            </div>
          ) : (
            <div className="spaces-directory-sections" style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 16 }}>
              {/* Joined Circles Section - Positioned Prominently at Top */}
              {joinedCircles.length > 0 && (
                <div
                  className="spaces-section joined-circles-top-section"
                  style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                        ⭐ Your Joined Circles ({joinedCircles.length})
                      </h3>
                      {joinedCircles.some((s) => s.hasUnreadMessages) && (
                        <span
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "#f87171",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 20,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: "#ef4444",
                              boxShadow: "0 0 8px #ef4444",
                              display: "inline-block",
                            }}
                          />
                          New Messages
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                      Communities you actively belong to
                    </span>
                  </div>
                  <div className="spaces-grid-list">
                    {joinedCircles.map(renderSpaceCard)}
                  </div>
                </div>
              )}

              {/* Suggested Circles Section */}
              {suggestedCircles.length > 0 && (
                <div className="spaces-section">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                        💡 Suggested Circles ({suggestedCircles.length})
                      </h3>
                      {userSchools.length > 0 && (
                        <span style={{ fontSize: "0.82rem", color: "#60a5fa", background: "rgba(59, 130, 246, 0.12)", padding: "3px 10px", borderRadius: 12, border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                          Sorted by relevance to your profile ({userSchools.slice(0, 2).join(", ")})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="spaces-grid-list">
                    {suggestedCircles.map(renderSpaceCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* =========================================================
           SELECTED SPACE DETAILED VIEW
           ========================================================= */
        <div className="space-detail-view">
          {/* Back Navigation Bar */}
          <button
            type="button"
            className="back-btn"
            onClick={() => setSelectedSpace(null)}
          >
            ← Back to Spaces Directory
          </button>

          {/* Space Header Banner Hero */}
          <div
            className="space-hero-banner"
            style={{
              backgroundImage: selectedSpace.bannerImage
                ? `linear-gradient(to bottom, rgba(11, 15, 25, 0.4), rgba(11, 15, 25, 0.95)), url(${selectedSpace.bannerImage})`
                : undefined,
            }}
          >
            <div className="hero-content">
              <div className="hero-top-row">
                <div className="hero-avatar">
                  {selectedSpace.avatarImage ? (
                    <img src={selectedSpace.avatarImage} alt="Space Avatar" className="hero-avatar-img" />
                  ) : (
                    <div className="hero-avatar-circle">
                      {selectedSpace.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="hero-title-block">
                  <div className="hero-badges">
                    {categoryBadge(selectedSpace.category)}
                    {selectedSpace.primarySchool && (
                      <span className="chip school-chip">{selectedSpace.primarySchool}</span>
                    )}
                  </div>
                  <h2>{selectedSpace.name}</h2>
                  <p className="hero-desc">{selectedSpace.description}</p>
                </div>
              </div>

              <div className="hero-actions-bar">
                <div className="hero-stats">
                  <span>👥 {selectedSpace.membersCount.toLocaleString()} {selectedSpace.membersCount === 1 ? "Member" : "Members"}</span>
                  <span>📜 {selectedSpace.postsCount} {selectedSpace.postsCount === 1 ? "Argument" : "Arguments"} Published</span>
                  {selectedSpace.hasUnreadMessages && selectedSpace.unreadCount ? (
                    <span style={{ color: "#f87171", fontWeight: 700 }}>
                      🔥 {selectedSpace.unreadCount} Unread {selectedSpace.unreadCount === 1 ? "Argument" : "Arguments"}
                    </span>
                  ) : null}
                </div>

                <div className="hero-buttons">
                  <button
                    type="button"
                    className="action-btn share-hero-btn"
                    style={{
                      background: "rgba(255, 255, 255, 0.12)",
                      color: "#f8fafc",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      padding: "10px 18px",
                      borderRadius: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onClick={() => handleOpenShareModal(selectedSpace)}
                  >
                    🔗 Share Circle
                  </button>

                  <button
                    type="button"
                    className={`join-btn-lg ${selectedSpace.isJoined ? "joined" : ""}`}
                    onClick={() => handleJoinToggle(selectedSpace)}
                  >
                    {selectedSpace.isJoined ? "✓ Circle Member (Click to Leave)" : "Join Circle"}
                  </button>

                  {onOpenComposerForSpace && (
                    <button
                      type="button"
                      className="connect-btn"
                      onClick={() => onOpenComposerForSpace(selectedSpace)}
                    >
                      ✍️ Publish Argument to {selectedSpace.name}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Space Context View Tabs */}
          <div className="space-view-tabs">
            <button
              type="button"
              className={`space-tab-btn ${spaceViewTab === "chat" ? "active" : ""}`}
              onClick={() => setSpaceViewTab("chat")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: spaceViewTab === "chat" ? "linear-gradient(135deg, #3b82f6, #6366f1)" : undefined,
                color: spaceViewTab === "chat" ? "#fff" : undefined,
              }}
            >
              💬 Group Chat Room ({circleChatMessages.length})
            </button>
            <button
              type="button"
              className={`space-tab-btn ${spaceViewTab === "feed" ? "active" : ""}`}
              onClick={() => setSpaceViewTab("feed")}
            >
              📜 Circle Arguments & Essays ({spacePosts.length})
            </button>
            <button
              type="button"
              className={`space-tab-btn ${spaceViewTab === "roster" ? "active" : ""}`}
              onClick={() => setSpaceViewTab("roster")}
            >
              👥 Key Thinkers & Member Roster ({spaceMembersList.length})
            </button>
          </div>

          {/* Tab Content */}
          {spaceViewTab === "chat" ? (
            <div
              className="circle-group-chat-container"
              style={{
                background: "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                borderRadius: 16,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: 520,
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
              }}
            >
              {/* Group Chat Banner Bar */}
              <div
                style={{
                  padding: "12px 18px",
                  background: "rgba(30, 41, 59, 0.9)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.2rem" }}>💬</span>
                  <div>
                    <strong style={{ fontSize: "0.95rem", color: "#f8fafc", display: "block" }}>
                      {selectedSpace.name} — Group Discussion
                    </strong>
                    <span style={{ fontSize: "0.78rem", color: "#60a5fa" }}>
                      🟢 {selectedSpace.membersCount || 4} Members in Group Chat
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    background: "rgba(59, 130, 246, 0.15)",
                    color: "#60a5fa",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    fontSize: "0.75rem",
                    padding: "3px 10px",
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  Live Group Chat
                </span>
              </div>

              {/* Messages Stream */}
              <div
                className="messages-stream"
                style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}
              >
                {isCircleChatLoading ? (
                  <div className="loading-state">Loading group chat stream...</div>
                ) : circleChatMessages.length === 0 ? (
                  <div className="empty-chat-state" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                    <p>💬 Welcome to {selectedSpace.name} Group Chat! Be the first to send a message to all members.</p>
                  </div>
                ) : (
                  circleChatMessages.map((msg) => {
                    const activeUserId = agoraClient.getCurrentUserId();
                    const msgSenderId = msg.senderId || msg.userId || (msg as any).createdById || "";
                    const currentUserIds = [user?.id, (user as any)?.sub, (user as any)?.pid, activeUserId].filter(Boolean);
                    const isMe = Boolean(msgSenderId && currentUserIds.includes(msgSenderId));

                    const memberMatch = spaceMembersList.find(
                      (m) =>
                        m.user?.id === msgSenderId ||
                        m.id === msgSenderId ||
                        (m.user?.id && msgSenderId && m.user.id.toLowerCase() === msgSenderId.toLowerCase())
                    );

                    const rawName = msg.senderName || msg.metadata?.senderName || msg.metadata?.authorName;
                    const isCleanName = rawName && rawName !== "Philosopher" && !rawName.startsWith("00000000") && !rawName.startsWith("usr-") && !rawName.startsWith("@");

                    const senderDisplayName =
                      (isMe ? user?.name || user?.username || "You" : null) ||
                      (isCleanName ? rawName : null) ||
                      memberMatch?.user?.name ||
                      memberMatch?.user?.username ||
                      "Circle Member";

                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble-wrapper ${isMe ? "me" : "them"}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMe ? "flex-end" : "flex-start",
                          marginBottom: 6,
                        }}
                      >
                        {!isMe && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, marginLeft: 4 }}>
                            {msg.senderAvatar ? (
                              <img
                                src={msg.senderAvatar}
                                alt="Avatar"
                                style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  background: "#6366f1",
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                }}
                              >
                                {senderDisplayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#93c5fd" }}>
                              {senderDisplayName}
                            </span>
                          </div>
                        )}
                        <div
                          className={`message-bubble ${isMe ? "me-bubble" : "them-bubble"}`}
                          style={{
                            maxWidth: "75%",
                            padding: "10px 14px",
                            borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                            background: isMe ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "#ffffff",
                            border: isMe ? "none" : "1px solid #cbd5e1",
                            color: isMe ? "#ffffff" : "#0f172a",
                            boxShadow: isMe ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.12)",
                          }}
                        >
                          <p
                            className="message-text"
                            style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.45, whiteSpace: "pre-wrap", color: isMe ? "#ffffff" : "#0f172a" }}
                          >
                            {msg.content}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: 4,
                              marginTop: 4,
                              opacity: 0.75,
                              fontSize: "0.7rem",
                            }}
                          >
                            <span>
                              {msg.createdAt
                                ? msg.createdAt.includes("T")
                                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                  : msg.createdAt
                                : "Just now"}
                            </span>
                            {isMe && (
                              <span
                                style={{
                                  color: "rgba(255, 255, 255, 0.6)",
                                  fontWeight: 400,
                                  letterSpacing: -1,
                                  fontSize: "0.75rem",
                                  marginLeft: 2,
                                }}
                                title="Sent to group"
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatStreamEndRef} />
              </div>

              {/* Group Chat Input Bar */}
              <form
                onSubmit={handleSendGroupChatMessage}
                className="chat-input-bar"
                style={{
                  padding: 12,
                  background: "rgba(15, 23, 42, 0.95)",
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  gap: 10,
                }}
              >
                <input
                  type="text"
                  className="input-text"
                  placeholder={`Group message to ${selectedSpace.name}...`}
                  value={circleChatInput}
                  onChange={(e) => setCircleChatInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 24,
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    background: "rgba(30, 41, 59, 0.7)",
                    color: "#ffffff",
                    fontSize: "0.9rem",
                  }}
                />
                <button
                  type="submit"
                  className="add-btn"
                  disabled={!circleChatInput.trim()}
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 24,
                    padding: "10px 20px",
                    fontWeight: 700,
                    cursor: circleChatInput.trim() ? "pointer" : "not-allowed",
                    opacity: circleChatInput.trim() ? 1 : 0.6,
                  }}
                >
                  Send 💬
                </button>
              </form>
            </div>
          ) : spaceViewTab === "feed" ? (
            <div className="space-posts-feed">
              {isPostsLoading ? (
                <div className="loading-state">Loading circle discussions...</div>
              ) : spacePosts.length === 0 ? (
                <div className="empty-state">No arguments published in this circle yet.</div>
              ) : (
                <div className="posts-list-grid">
                  {spacePosts.map((post) => {
                    const isUpvoted = upvotedPostIds.includes(post.id);
                    const isCommentsExpanded = expandedCommentsPostIds.includes(post.id);

                    return (
                      <div key={post.id} className="search-result-card post-feed-card">
                        <div className="post-author-row">
                          <div className="author-identity">
                            {post.authorAvatar ? (
                              <img src={post.authorAvatar} alt="Avatar" className="author-avatar-img" />
                            ) : (
                              <div className="author-avatar-circle">
                                {(post.authorName || post.authorHandle || "T").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="author-name-text">{post.authorName || post.authorHandle || "Thinker"}</span>
                              <span className="author-handle-text">@{post.authorHandle || "thinker"}</span>
                            </div>
                          </div>

                          <div className="post-tags-row">
                            <span className="result-type-tag argument">
                              {post.postType.toUpperCase().replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        <h3 className="result-title" style={{ marginTop: 12, fontSize: "1.25rem" }}>
                          {post.title}
                        </h3>
                        <p className="result-snippet" style={{ margin: "10px 0 16px 0", lineHeight: 1.5 }}>
                          {post.content}
                        </p>

                        <div className="card-actions" style={{ justifyContent: "space-between" }}>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className={`upvote-btn ${isUpvoted ? "active" : ""}`}
                              onClick={() => handleUpvotePost(post.id)}
                            >
                              ▲ {post.upvotesCount}
                            </button>

                            <button
                              type="button"
                              className={`action-btn ${isCommentsExpanded ? "active" : ""}`}
                              onClick={() => toggleCommentsSection(post.id)}
                            >
                              💬 Comments & Debate Tree ({post.commentsCount})
                            </button>

                            {onOpenDebateSummary && (
                              <button
                                type="button"
                                className="ai-summary-trigger-btn"
                                onClick={() => onOpenDebateSummary(post.id)}
                              >
                                🧠 AI Debate Summary
                              </button>
                            )}
                          </div>

                          {onOpenDM && (
                            <button
                              type="button"
                              className="connect-btn"
                              style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                              onClick={() =>
                                onOpenDM({
                                  id: post.authorId,
                                  name: post.authorName,
                                  username: post.authorHandle,
                                  avatar: post.authorAvatar,
                                } as User)
                              }
                            >
                              💬 Message Author
                            </button>
                          )}
                        </div>

                        {isCommentsExpanded && (
                          <PhilosophicalCommentsSection
                            entityId={post.id}
                            postAuthorId={post.authorId}
                            postAuthorName={post.authorName}
                            postAuthorHandle={post.authorHandle}
                            onOpenDebateSummary={onOpenDebateSummary}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Member Roster Tab */
            <div className="space-roster-view">
              {selectedSpace.keyThinkers && selectedSpace.keyThinkers.length > 0 && (
                <div className="roster-section">
                  <h4>🧠 Core Philosophical Figures & Influences</h4>
                  <div className="thinker-roster-grid">
                    {selectedSpace.keyThinkers.map((thinker, i) => (
                      <div key={i} className="thinker-roster-card">
                        <div className="thinker-avatar-icon">🧠</div>
                        <div className="thinker-info">
                          <h5>{thinker}</h5>
                          <span>Historical Steward of {selectedSpace.primarySchool || selectedSpace.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="roster-section" style={{ marginTop: 28 }}>
                <h4>👥 Active Community Stewards & Members</h4>
                {isMembersLoading ? (
                  <div className="loading-state" style={{ padding: 20 }}>Loading circle members...</div>
                ) : spaceMembersList.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>No active members recorded yet.</div>
                ) : (
                  <div className="stewards-list">
                    {spaceMembersList.map((member) => {
                      const u = member.user || ({} as User);
                      const uName = u.name || u.username || "Circle Member";
                      const uHandle = u.username || "member";
                      return (
                        <div key={member.id} className="steward-card">
                          {u.avatar ? (
                            <img src={u.avatar} alt={uName} className="steward-avatar" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div className="steward-avatar">{uName.charAt(0).toUpperCase()}</div>
                          )}
                          <div className="steward-details">
                            <span className="steward-name">{uName}</span>
                            <span className="steward-handle">@{uHandle} • {member.role.toUpperCase()}</span>
                          </div>
                          {onOpenDM && (
                            <button
                              type="button"
                              className="connect-btn-sm"
                              onClick={() => onOpenDM(u)}
                            >
                              💬 DM
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW CIRCLE MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div className="modal-card" style={{ background: "var(--bg-card, #111827)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, width: "100%", maxWidth: 520, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: 8 }}>🏛️ Create Philosophical Circle</h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
            </div>

            <form onSubmit={handleCreateSpaceSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6, color: "#cbd5e1" }}>Circle Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phenomenological Research Group"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)", color: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6, color: "#cbd5e1" }}>Circle Type / Category</label>
                <select
                  value={newSpaceCategory}
                  onChange={(e) => setNewSpaceCategory(e.target.value as any)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "#1f2937", color: "#fff" }}
                >
                  <option value="school">🏛️ School of Thought (e.g. Existentialism, Stoicism)</option>
                  <option value="thinker">🧠 Thinker Guild (e.g. Nietzsche, Kant, Camus)</option>
                  <option value="domain">🔍 Domain of Inquiry (e.g. Ethics, Mind, Logic)</option>
                  <option value="general">🌐 General Philosophical Circle</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6, color: "#cbd5e1" }}>Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the purpose, topics, and discourse goals of this circle..."
                  value={newSpaceDesc}
                  onChange={(e) => setNewSpaceDesc(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)", color: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6, color: "#cbd5e1" }}>Primary School / Focus Area</label>
                <input
                  type="text"
                  placeholder="e.g. Phenomenology, Bioethics"
                  value={newSpaceSchool}
                  onChange={(e) => setNewSpaceSchool(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)", color: "#fff" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 6, color: "#cbd5e1" }}>Key Influential Thinkers (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Edmund Husserl, Martin Heidegger, Maurice Merleau-Ponty"
                  value={newSpaceThinkers}
                  onChange={(e) => setNewSpaceThinkers(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)", color: "#fff" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#cbd5e1", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSpace}
                  style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: isCreatingSpace ? 0.7 : 1 }}
                >
                  {isCreatingSpace ? "Creating..." : "Create Circle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Circle Modal */}
      {shareTargetSpace && (
        <div className="share-modal-overlay" onClick={() => setShareTargetSpace(null)}>
          <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                🔗 Share Circle Link
              </h3>
              <button
                type="button"
                onClick={() => setShareTargetSpace(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: 14, borderRadius: 12, marginBottom: 18, border: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: "1.5rem" }}>🏛️</span>
                <strong style={{ fontSize: "1rem", color: "#f8fafc" }}>{shareTargetSpace.name}</strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.4 }}>{shareTargetSpace.description}</p>
            </div>

            {/* Copy Link Section */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 6, color: "#94a3b8" }}>
                DIRECT CIRCLE LINK
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={`https://agora.app/spaces/${shareTargetSpace.slug || shareTargetSpace.id}`}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)", color: "#60a5fa", fontSize: "0.85rem" }}
                />
                <button
                  type="button"
                  onClick={() => handleCopyCircleLink(shareTargetSpace)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}
                >
                  {copiedToast ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>

            {/* Share to Direct Message Friends */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 8, color: "#94a3b8" }}>
                SEND TO FRIEND IN DIRECT MESSAGE
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                {recentFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => handleSendCircleToFriend(shareTargetSpace, friend)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(255, 255, 255, 0.03)", color: "#f8fafc", cursor: "pointer", transition: "background 0.2s ease" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {friend.avatar ? (
                        <img src={friend.avatar} alt="Avatar" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                          {(friend.name || friend.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{friend.name || friend.username}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>@{friend.username || "philosopher"}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "#3b82f6", fontWeight: 700 }}>Send 💬</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
