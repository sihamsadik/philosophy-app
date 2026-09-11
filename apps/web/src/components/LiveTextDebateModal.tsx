import React, { useState } from "react";
import type { User } from "@agora-server/contract";

export interface LiveTextDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  thinker: User | null;
}

interface DebateMessage {
  id: string;
  authorName: string;
  authorHandle: string;
  stance: "thesis" | "antithesis" | "synthesis";
  content: string;
  timestamp: string;
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
        stance: "thesis",
        content: "If God does not exist, there is at least one being who exists before he can be defined by any concept: man.",
        timestamp: "10m ago",
      },
      {
        id: "m2",
        authorName: "Simone de Beauvoir",
        authorHandle: "beauvoir",
        stance: "thesis",
        content: "One is not born, but rather becomes, a woman. Our choices shape our situation.",
        timestamp: "7m ago",
      },
      {
        id: "m3",
        authorName: "Baruch Spinoza",
        authorHandle: "spinoza",
        stance: "antithesis",
        content: "Men believe themselves free simply because they are conscious of their actions, and unconscious of the causes by which those actions are determined.",
        timestamp: "3m ago",
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
        stance: "thesis",
        content: "Fables should be taught as fables, myths as myths, and miracles as poetic fancies. To teach superstitions as truths is a terrible thing.",
        timestamp: "15m ago",
      },
      {
        id: "m2",
        authorName: "Plato",
        authorHandle: "plato",
        stance: "synthesis",
        content: "Thinking is the talking of the soul with itself in search of pure forms.",
        timestamp: "5m ago",
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
        stance: "thesis",
        content: "What does not kill me makes me stronger. Amor Fati — embrace your fate unconditionally.",
        timestamp: "20m ago",
      },
      {
        id: "m2",
        authorName: "Arthur Schopenhauer",
        authorHandle: "schopenhauer",
        stance: "antithesis",
        content: "Life swings like a pendulum backward and forward between pain and boredom.",
        timestamp: "12m ago",
      },
    ],
  },
};

export const LiveTextDebateModal: React.FC<LiveTextDebateModalProps> = ({
  isOpen,
  onClose,
  thinker,
}) => {
  const [userReply, setUserReply] = useState("");
  const [selectedStance, setSelectedStance] = useState<"thesis" | "antithesis" | "synthesis">("antithesis");
  const [localMessages, setLocalMessages] = useState<Record<string, DebateMessage[]>>({});

  if (!isOpen || !thinker) return null;

  const thinkerId = thinker.id || "usr-sartre-001";
  const debateData = INITIAL_DEBATES[thinkerId] || {
    topic: `Live philosophical text debate hosted by ${thinker.name || thinker.username}`,
    school: "Philosophy Circle",
    messages: [
      {
        id: "m1",
        authorName: thinker.name || thinker.username || "Philosopher",
        authorHandle: thinker.username || "thinker",
        stance: "thesis",
        content: "Welcome to this live text argument! Share your stance below.",
        timestamp: "Just now",
      },
    ],
  };

  const currentMessages = [
    ...debateData.messages,
    ...(localMessages[thinkerId] || []),
  ];

  const handlePostArgument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userReply.trim()) return;

    const newMsg: DebateMessage = {
      id: `usr-msg-${Date.now()}`,
      authorName: "You (Philosophical Contributor)",
      authorHandle: "you",
      stance: selectedStance,
      content: userReply.trim(),
      timestamp: "Just now",
    };

    setLocalMessages((prev) => ({
      ...prev,
      [thinkerId]: [...(prev[thinkerId] || []), newMsg],
    }));

    setUserReply("");
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="live-text-debate-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="live-debate-header">
          <div className="thinker-profile-row">
            {thinker.avatar ? (
              <img src={thinker.avatar} alt="Avatar" className="navbar-avatar-img" />
            ) : (
              <div className="navbar-avatar-circle">
                {(thinker.name || thinker.username || "T").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="thinker-name-title">
                <h3>{thinker.name || thinker.username}</h3>
                <span className="live-pulse-badge">🔴 LIVE TEXT DEBATE</span>
              </div>
              <span className="thinker-school-tag">📜 {debateData.school}</span>
            </div>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Live Topic Thesis Box */}
        <div className="live-topic-box">
          <span className="live-topic-label">CORE THESIS FOR DEBATE:</span>
          <p className="live-topic-text">"{debateData.topic}"</p>
        </div>

        {/* Live Message Arguments Stream */}
        <div className="live-arguments-stream">
          {currentMessages.map((msg) => (
            <div key={msg.id} className={`live-argument-bubble ${msg.stance}`}>
              <div className="bubble-header">
                <span className="bubble-author">{msg.authorName}</span>
                <span className={`stance-badge-pill ${msg.stance}`}>
                  {msg.stance === "thesis"
                    ? "🟢 Thesis"
                    : msg.stance === "antithesis"
                    ? "🔴 Antithesis"
                    : "⚪ Synthesis"}
                </span>
                <span className="bubble-time">{msg.timestamp}</span>
              </div>
              <p className="bubble-content">{msg.content}</p>
            </div>
          ))}
        </div>

        {/* Live Counter-Argument Input Form */}
        <form onSubmit={handlePostArgument} className="live-argument-form">
          <div className="stance-selector-row">
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Your Stance:</span>
            <button
              type="button"
              className={`stance-select-btn thesis ${selectedStance === "thesis" ? "active" : ""}`}
              onClick={() => setSelectedStance("thesis")}
            >
              🟢 Thesis (Proponent)
            </button>
            <button
              type="button"
              className={`stance-select-btn antithesis ${selectedStance === "antithesis" ? "active" : ""}`}
              onClick={() => setSelectedStance("antithesis")}
            >
              🔴 Antithesis (Rebuttal)
            </button>
            <button
              type="button"
              className={`stance-select-btn synthesis ${selectedStance === "synthesis" ? "active" : ""}`}
              onClick={() => setSelectedStance("synthesis")}
            >
              ⚪ Synthesis
            </button>
          </div>

          <div className="live-input-row">
            <input
              type="text"
              className="live-text-input"
              placeholder="Submit text argument or counter-rebuttal..."
              value={userReply}
              onChange={(e) => setUserReply(e.target.value)}
            />
            <button type="submit" className="connect-btn" style={{ padding: "8px 16px" }}>
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
