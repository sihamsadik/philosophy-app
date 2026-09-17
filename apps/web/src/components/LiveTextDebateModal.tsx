import React, { useState, useEffect, useRef } from "react";
import type { User } from "@philosophy/contract";
import type { PhilosophyEvent } from "../lib/api-client.js";
import { agoraClient } from "../lib/api-client.js";

export interface LiveTextDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  thinker: User | null;
  event?: PhilosophyEvent | null;
}

interface DebateMessage {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string | null;
  stance: "thesis" | "antithesis" | "synthesis";
  content: string;
  timestamp: string;
  reactions: { upvotes: number; fire: number; insights: number };
}

const INITIAL_DEBATES: Record<string, { topic: string; school: string; messages: DebateMessage[] }> = {
  "usr-sartre-001": {
    topic: "Existence precedes essence — man is condemned to be free without divine pre-determination.",
    school: "Existentialism",
    messages: [
      {
        id: "m1",
        authorName: "Jean-Paul Sartre",
        authorHandle: "sartre",
        authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        stance: "thesis",
        content: "If God does not exist, there is at least one being who exists before he can be defined by any concept: man.",
        timestamp: "12m ago",
        reactions: { upvotes: 18, fire: 14, insights: 9 },
      },
      {
        id: "m2",
        authorName: "Simone de Beauvoir",
        authorHandle: "beauvoir",
        authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
        stance: "thesis",
        content: "One is not born, but rather becomes, a woman. Our choices shape our situation.",
        timestamp: "8m ago",
        reactions: { upvotes: 24, fire: 19, insights: 12 },
      },
      {
        id: "m3",
        authorName: "Baruch Spinoza",
        authorHandle: "spinoza",
        authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        stance: "antithesis",
        content: "Men believe themselves free simply because they are conscious of their actions, and unconscious of the causes by which those actions are determined.",
        timestamp: "4m ago",
        reactions: { upvotes: 15, fire: 8, insights: 14 },
      },
    ],
  },
  "usr-hypatia-002": {
    topic: "Reserve your right to think, for even to think wrongly is better than not to think at all.",
    school: "Neo-Platonism",
    messages: [
      {
        id: "m1",
        authorName: "Hypatia of Alexandria",
        authorHandle: "hypatia",
        authorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
        stance: "thesis",
        content: "Fables should be taught as fables, myths as myths, and miracles as poetic fancies. To teach superstitions as truths is a terrible thing.",
        timestamp: "15m ago",
        reactions: { upvotes: 31, fire: 22, insights: 17 },
      },
      {
        id: "m2",
        authorName: "Plato",
        authorHandle: "plato",
        authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
        stance: "synthesis",
        content: "Thinking is the talking of the soul with itself in search of pure forms.",
        timestamp: "6m ago",
        reactions: { upvotes: 27, fire: 15, insights: 21 },
      },
    ],
  },
  "usr-nietzsche-004": {
    topic: "He who has a why to live can bear almost any how — suffering is the chisel of greatness.",
    school: "Existential / Will to Power",
    messages: [
      {
        id: "m1",
        authorName: "Friedrich Nietzsche",
        authorHandle: "nietzsche",
        authorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
        stance: "thesis",
        content: "What does not kill me makes me stronger. Amor Fati — embrace your fate unconditionally.",
        timestamp: "20m ago",
        reactions: { upvotes: 42, fire: 38, insights: 19 },
      },
      {
        id: "m2",
        authorName: "Arthur Schopenhauer",
        authorHandle: "schopenhauer",
        authorAvatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80",
        stance: "antithesis",
        content: "Life swings like a pendulum backward and forward between pain and boredom.",
        timestamp: "10m ago",
        reactions: { upvotes: 19, fire: 11, insights: 16 },
      },
    ],
  },
};

const SIMULATED_LIVE_MESSAGES: Array<{ authorName: string; authorHandle: string; avatar: string; stance: "thesis" | "antithesis" | "synthesis"; content: string }> = [
  {
    authorName: "Albert Camus",
    authorHandle: "camus",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    stance: "synthesis",
    content: "The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion!",
  },
  {
    authorName: "Hannah Arendt",
    authorHandle: "arendt",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    stance: "antithesis",
    content: "Freedom is not merely an internal psychological state, but a public condition manifested through action in the political sphere.",
  },
  {
    authorName: "G.W.F. Hegel",
    authorHandle: "hegel",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    stance: "synthesis",
    content: "The history of the world is none other than the progress of the consciousness of freedom.",
  },
  {
    authorName: "Ludwig Wittgenstein",
    authorHandle: "wittgenstein",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
    stance: "antithesis",
    content: "The limits of my language mean the limits of my world. We must scrutinize the grammar of freedom.",
  },
  {
    authorName: "Marcus Aurelius",
    authorHandle: "aurelius",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    stance: "thesis",
    content: "You have power over your mind — not outside events. Realize this, and you will find invincible strength.",
  },
];

export const LiveTextDebateModal: React.FC<LiveTextDebateModalProps> = ({
  isOpen,
  onClose,
  thinker,
  event,
}) => {
  const [userReply, setUserReply] = useState("");
  const [selectedStance, setSelectedStance] = useState<"thesis" | "antithesis" | "synthesis">("antithesis");
  const [localMessages, setLocalMessages] = useState<Record<string, DebateMessage[]>>({});
  const [activeViewers, setActiveViewers] = useState<number>(event?.attendeeCount || 1);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(450);
  const [newIncomingNotification, setNewIncomingNotification] = useState<string | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem("agora_user_reactions_map");
      if (raw) setUserReactions(JSON.parse(raw));
    } catch {}
  }, [isOpen]);

  const thinkerId = thinker?.id || (event ? `evt-${event.id}` : "usr-sartre-001");

  useEffect(() => {
    if (event?.attendeeCount !== undefined) {
      setActiveViewers(event.attendeeCount);
    } else {
      setActiveViewers(1);
    }
  }, [event]);

  // Live Timer
  useEffect(() => {
    if (!isOpen) return;

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [isOpen]);

  // Load messages from persistent storage / API
  useEffect(() => {
    if (!isOpen || (!thinker && !event)) return;
    const targetId = event ? event.id : thinkerId;

    agoraClient.getEventMessages(targetId).then((res) => {
      if (res.messages && res.messages.length > 0) {
        setLocalMessages((prev) => ({
          ...prev,
          [thinkerId]: res.messages,
        }));
      }
    });
  }, [isOpen, thinker, event, thinkerId]);

  if (!isOpen || (!thinker && !event)) return null;

  const activeHostName = event?.hostUser?.name || event?.hostUser?.username || thinker?.name || thinker?.username || "Host Philosopher";
  const activeHostHandle = event?.hostUser?.username || thinker?.username || "thinker";
  const activeHostAvatar = event?.hostUser?.avatar || thinker?.avatar;

  const debateData = INITIAL_DEBATES[thinkerId] || {
    topic: event
      ? `${event.title}${event.description ? ` — ${event.description}` : ""}`
      : `Live philosophical text debate hosted by ${activeHostName}`,
    school: event?.spaceName || "Philosophy Agora Circle",
    messages: [
      {
        id: "m1",
        authorName: activeHostName,
        authorHandle: activeHostHandle,
        authorAvatar: activeHostAvatar,
        stance: "thesis",
        content: event?.description || "Welcome to this live text debate room! Join the argument with your thesis, antithesis rebuttal, or synthesis.",
        timestamp: "Just now",
        reactions: { upvotes: 0, fire: 0, insights: 0 },
      },
    ],
  };

  const currentMessages = [
    ...(localMessages[thinkerId] && localMessages[thinkerId].length > 0
      ? localMessages[thinkerId]
      : debateData.messages),
  ];

  // Calculate Stance Heatbar Percentages
  const thesisCount = currentMessages.filter((m) => m.stance === "thesis").length;
  const antithesisCount = currentMessages.filter((m) => m.stance === "antithesis").length;
  const synthesisCount = currentMessages.filter((m) => m.stance === "synthesis").length;
  const totalStances = currentMessages.length || 1;
  const thesisPct = Math.round((thesisCount / totalStances) * 100);
  const antiPct = Math.round((antithesisCount / totalStances) * 100);
  const synPct = 100 - thesisPct - antiPct;

  const handlePostArgument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userReply.trim()) return;

    const targetId = event ? event.id : thinkerId;
    const authorName = "You (Philosophical Contributor)";
    const authorHandle = "you";
    const contentText = userReply.trim();
    setUserReply("");

    const res = await agoraClient.postEventMessage(targetId, {
      authorName,
      authorHandle,
      stance: selectedStance,
      content: contentText,
    });

    setLocalMessages((prev) => ({
      ...prev,
      [thinkerId]: [...(prev[thinkerId] || (debateData.messages as any)), res.message],
    }));

    setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.scrollTop = streamRef.current.scrollHeight;
      }
    }, 100);
  };



  const handleReaction = async (msgId: string, reactionType: "upvotes" | "fire" | "insights") => {
    const targetId = event ? event.id : thinkerId;
    const prevReaction = userReactions[msgId] || null;
    const nextReaction = prevReaction === reactionType ? null : reactionType;

    const nextMap = { ...userReactions };
    if (nextReaction) {
      nextMap[msgId] = nextReaction;
    } else {
      delete nextMap[msgId];
    }
    setUserReactions(nextMap);

    setLocalMessages((prev) => {
      const list = prev[thinkerId] || debateData.messages;
      const updated = list.map((m) => {
        if (m.id === msgId) {
          const reactions = { ...(m.reactions || { upvotes: 0, fire: 0, insights: 0 }) };
          if (prevReaction === reactionType) {
            reactions[reactionType] = Math.max(0, (reactions[reactionType] || 0) - 1);
          } else {
            if (prevReaction && reactions[prevReaction as "upvotes" | "fire" | "insights"] > 0) {
              reactions[prevReaction as "upvotes" | "fire" | "insights"] -= 1;
            }
            reactions[reactionType] = (reactions[reactionType] || 0) + 1;
          }
          return { ...m, reactions };
        }
        return m;
      });
      return { ...prev, [thinkerId]: updated };
    });

    await agoraClient.reactToEventMessage(targetId, msgId, reactionType);
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="live-text-debate-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header Bar */}
        <div className="live-debate-header" style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <div className="thinker-profile-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {activeHostAvatar ? (
              <img src={activeHostAvatar} alt="Avatar" className="navbar-avatar-img" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div className="navbar-avatar-circle" style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--primary-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {activeHostName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="thinker-name-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{activeHostName}</h3>
                <span className="live-pulse-badge" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: 12, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }}></span>
                  🔴 LIVE NOW — {formatTimer(elapsedSeconds)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                <span>📜 {debateData.school}</span>
                <span>👁️ {activeViewers} Thinkers In Room</span>
                <span>💬 {currentMessages.length} Arguments</span>
              </div>
            </div>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        {/* Live Notification Banner */}
        {newIncomingNotification && (
          <div style={{ background: "linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)", borderBottom: "1px solid rgba(59, 130, 246, 0.3)", padding: "6px 16px", fontSize: "0.82rem", color: "#60a5fa", textAlign: "center", fontWeight: 600 }}>
            {newIncomingNotification}
          </div>
        )}

        {/* Core Thesis Box & Stance Breakdown Heatbar */}
        <div className="live-topic-box" style={{ padding: 16, background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <span className="live-topic-label" style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700, letterSpacing: "0.05em" }}>CORE THESIS FOR DEBATE:</span>
          <p className="live-topic-text" style={{ margin: "4px 0 12px 0", fontSize: "0.95rem", fontStyle: "italic", lineHeight: 1.4 }}>"{debateData.topic}"</p>

          {/* Stance Heatbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem" }}>
            <span style={{ color: "#4ade80", fontWeight: 600 }}>🟢 Thesis {thesisPct}%</span>
            <div style={{ flex: 1, height: 6, borderRadius: 4, background: "rgba(255,255,255,0.1)", display: "flex", overflow: "hidden" }}>
              <div style={{ width: `${thesisPct}%`, background: "#4ade80" }}></div>
              <div style={{ width: `${antiPct}%`, background: "#f87171" }}></div>
              <div style={{ width: `${synPct}%`, background: "#a855f7" }}></div>
            </div>
            <span style={{ color: "#f87171", fontWeight: 600 }}>🔴 Antithesis {antiPct}%</span>
            <span style={{ color: "#a855f7", fontWeight: 600 }}>⚪ Synthesis {synPct}%</span>
          </div>
        </div>

        {/* Live Message Arguments Stream */}
        <div className="live-arguments-stream" ref={streamRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {currentMessages.map((msg) => (
            <div
              key={msg.id}
              className={`live-argument-bubble ${msg.stance}`}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: msg.stance === "thesis" ? "1px solid rgba(74, 222, 128, 0.3)" : msg.stance === "antithesis" ? "1px solid rgba(248, 113, 113, 0.3)" : "1px solid rgba(168, 85, 247, 0.3)",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div className="bubble-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {msg.authorAvatar ? (
                    <img src={msg.authorAvatar} alt="" style={{ width: 22, height: 22, borderRadius: "50%" }} />
                  ) : null}
                  <span className="bubble-author" style={{ fontWeight: 700, fontSize: "0.88rem" }}>{msg.authorName}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={`stance-badge-pill ${msg.stance}`}
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: msg.stance === "thesis" ? "rgba(74, 222, 128, 0.15)" : msg.stance === "antithesis" ? "rgba(248, 113, 113, 0.15)" : "rgba(168, 85, 247, 0.15)",
                      color: msg.stance === "thesis" ? "#4ade80" : msg.stance === "antithesis" ? "#f87171" : "#c084fc",
                    }}
                  >
                    {msg.stance === "thesis" ? "🟢 Thesis" : msg.stance === "antithesis" ? "🔴 Antithesis" : "⚪ Synthesis"}
                  </span>
                  <span className="bubble-time" style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{msg.timestamp}</span>
                </div>
              </div>

              <p className="bubble-content" style={{ margin: "0 0 10px 0", fontSize: "0.92rem", lineHeight: 1.5, color: "#f1f5f9" }}>{msg.content}</p>

              {/* Reaction Buttons Bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => handleReaction(msg.id, "upvotes")}
                  style={{
                    background: userReactions[msg.id] === "upvotes" ? "rgba(59, 130, 246, 0.25)" : "rgba(255,255,255,0.06)",
                    border: userReactions[msg.id] === "upvotes" ? "1px solid rgba(59, 130, 246, 0.5)" : "1px solid transparent",
                    borderRadius: 8,
                    padding: "4px 8px",
                    color: userReactions[msg.id] === "upvotes" ? "#60a5fa" : "#cbd5e1",
                    fontSize: "0.75rem",
                    fontWeight: userReactions[msg.id] === "upvotes" ? 700 : 400,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  👍 {msg.reactions?.upvotes || 0}
                </button>
                <button
                  type="button"
                  onClick={() => handleReaction(msg.id, "fire")}
                  style={{
                    background: userReactions[msg.id] === "fire" ? "rgba(239, 68, 68, 0.25)" : "rgba(255,255,255,0.06)",
                    border: userReactions[msg.id] === "fire" ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid transparent",
                    borderRadius: 8,
                    padding: "4px 8px",
                    color: userReactions[msg.id] === "fire" ? "#f87171" : "#cbd5e1",
                    fontSize: "0.75rem",
                    fontWeight: userReactions[msg.id] === "fire" ? 700 : 400,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  🔥 {msg.reactions?.fire || 0}
                </button>
                <button
                  type="button"
                  onClick={() => handleReaction(msg.id, "insights")}
                  style={{
                    background: userReactions[msg.id] === "insights" ? "rgba(168, 85, 247, 0.25)" : "rgba(255,255,255,0.06)",
                    border: userReactions[msg.id] === "insights" ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid transparent",
                    borderRadius: 8,
                    padding: "4px 8px",
                    color: userReactions[msg.id] === "insights" ? "#c084fc" : "#cbd5e1",
                    fontSize: "0.75rem",
                    fontWeight: userReactions[msg.id] === "insights" ? 700 : 400,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  💡 {msg.reactions?.insights || 0}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Live Counter-Argument Input Form */}
        <form onSubmit={handlePostArgument} className="live-argument-form" style={{ padding: 16, background: "rgba(15, 23, 42, 0.95)", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <div className="stance-selector-row" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Your Stance:</span>
            <button
              type="button"
              className={`stance-select-btn thesis ${selectedStance === "thesis" ? "active" : ""}`}
              onClick={() => setSelectedStance("thesis")}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid rgba(74, 222, 128, 0.4)",
                background: selectedStance === "thesis" ? "rgba(74, 222, 128, 0.2)" : "transparent",
                color: "#4ade80",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🟢 Thesis (Proponent)
            </button>
            <button
              type="button"
              className={`stance-select-btn antithesis ${selectedStance === "antithesis" ? "active" : ""}`}
              onClick={() => setSelectedStance("antithesis")}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid rgba(248, 113, 113, 0.4)",
                background: selectedStance === "antithesis" ? "rgba(248, 113, 113, 0.2)" : "transparent",
                color: "#f87171",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔴 Antithesis (Rebuttal)
            </button>
            <button
              type="button"
              className={`stance-select-btn synthesis ${selectedStance === "synthesis" ? "active" : ""}`}
              onClick={() => setSelectedStance("synthesis")}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid rgba(168, 85, 247, 0.4)",
                background: selectedStance === "synthesis" ? "rgba(168, 85, 247, 0.2)" : "transparent",
                color: "#c084fc",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ⚪ Synthesis
            </button>
          </div>

          <div className="live-input-row" style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              className="live-text-input"
              placeholder="Submit real-time text argument or counter-rebuttal..."
              value={userReply}
              onChange={(e) => setUserReply(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff",
                fontSize: "0.9rem",
              }}
            />
            <button type="submit" style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#ffffff", fontWeight: 700, cursor: "pointer" }}>
              Send 💬
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
