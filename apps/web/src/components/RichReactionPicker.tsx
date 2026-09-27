import React, { useState, useEffect } from "react";
import { agoraClient } from "../lib/api-client.js";

export type ReactionType = "love" | "upvote" | "wow" | "funny" | "downvote";

export interface ReactionConfig {
  key: ReactionType;
  emoji: string;
  label: string;
  pointsLabel: string;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}

export const REACTION_CONFIGS: ReactionConfig[] = [
  {
    key: "love",
    emoji: "❤️",
    label: "Love",
    pointsLabel: "+2 Rep",
    activeColor: "#f43f5e",
    activeBg: "rgba(244, 63, 94, 0.15)",
    activeBorder: "rgba(244, 63, 94, 0.5)",
  },
  {
    key: "upvote",
    emoji: "👍",
    label: "Upvote",
    pointsLabel: "+1 Rep",
    activeColor: "#3b82f6",
    activeBg: "rgba(59, 130, 246, 0.15)",
    activeBorder: "rgba(59, 130, 246, 0.5)",
  },
  {
    key: "wow",
    emoji: "😮",
    label: "Insightful",
    pointsLabel: "+1 Rep",
    activeColor: "#f59e0b",
    activeBg: "rgba(245, 158, 11, 0.15)",
    activeBorder: "rgba(245, 158, 11, 0.5)",
  },
  {
    key: "funny",
    emoji: "😄",
    label: "Wit",
    pointsLabel: "+1 Rep",
    activeColor: "#10b981",
    activeBg: "rgba(16, 185, 129, 0.15)",
    activeBorder: "rgba(16, 185, 129, 0.5)",
  },
  {
    key: "downvote",
    emoji: "👎",
    label: "Disagree",
    pointsLabel: "0 Rep",
    activeColor: "#94a3b8",
    activeBg: "rgba(148, 163, 184, 0.15)",
    activeBorder: "rgba(148, 163, 184, 0.4)",
  },
];

export interface RichReactionPickerProps {
  targetId: string;
  targetType: "entity" | "comment";
  reactionCounts?: Record<string, number>;
  userReaction?: string | null;
  onReactionChange?: (newReaction: string | null, newCounts: Record<string, number>) => void;
  size?: "md" | "sm";
}

export const RichReactionPicker: React.FC<RichReactionPickerProps> = ({
  targetId,
  targetType,
  reactionCounts = {},
  userReaction = null,
  onReactionChange,
  size = "md",
}) => {
  const [activeReaction, setActiveReaction] = useState<string | null>(userReaction);
  const [counts, setCounts] = useState<Record<string, number>>({ ...reactionCounts });

  useEffect(() => {
    setActiveReaction(userReaction);
  }, [userReaction]);

  useEffect(() => {
    setCounts({ ...reactionCounts });
  }, [JSON.stringify(reactionCounts)]);

  const handleToggleReaction = async (typeKey: ReactionType) => {
    const prevReaction = activeReaction;
    const isRemoving = prevReaction === typeKey;
    const newActive = isRemoving ? null : typeKey;

    // Optimistically update counts
    const nextCounts = { ...counts };
    if (prevReaction && prevReaction in nextCounts) {
      nextCounts[prevReaction] = Math.max(0, (nextCounts[prevReaction] || 0) - 1);
    }
    if (!isRemoving) {
      nextCounts[typeKey] = (nextCounts[typeKey] || 0) + 1;
    }

    setActiveReaction(newActive);
    setCounts(nextCounts);
    if (onReactionChange) {
      onReactionChange(newActive, nextCounts);
    }

    try {
      let res: { userReaction: string | null; reactionCounts: Record<string, number> };
      if (targetType === "entity") {
        res = await agoraClient.reactToEntity(targetId, typeKey);
      } else {
        res = await agoraClient.reactToComment(targetId, typeKey);
      }
      if (res && res.reactionCounts && Object.keys(res.reactionCounts).length > 0) {
        const mergedCounts = { ...nextCounts, ...res.reactionCounts };
        const finalActive = res.userReaction !== undefined ? res.userReaction : newActive;
        setActiveReaction(finalActive);
        setCounts(mergedCounts);
        if (onReactionChange) {
          onReactionChange(finalActive, mergedCounts);
        }
      }
    } catch (err: any) {
      console.error(`Reaction failed for ${targetType}:`, err);
      // Rollback to previous reaction state
      setActiveReaction(prevReaction);
      setCounts(counts);
      if (onReactionChange) {
        onReactionChange(prevReaction, counts);
      }
      alert(`Unable to save reaction to server: ${err?.message || "Server error"}`);
    }
  };

  const isSmall = size === "sm";

  return (
    <div
      className={`rich-reaction-picker-bar ${isSmall ? "size-sm" : "size-md"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? 4 : 6,
        background: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: isSmall ? 20 : 24,
        padding: isSmall ? "2px 6px" : "4px 8px",
        flexWrap: "wrap",
      }}
    >
      {REACTION_CONFIGS.map((config) => {
        const isActive = activeReaction === config.key;
        const countVal = counts[config.key] || 0;

        return (
          <button
            key={config.key}
            type="button"
            className={`reaction-pill-btn ${isActive ? "active" : ""}`}
            title={`${config.label} (${config.pointsLabel})`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleReaction(config.key);
            }}
            style={{
              background: isActive ? config.activeBg : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${isActive ? config.activeBorder : "rgba(255, 255, 255, 0.08)"}`,
              color: isActive ? config.activeColor : "#cbd5e1",
              borderRadius: isSmall ? 14 : 18,
              padding: isSmall ? "2px 7px" : "4px 10px",
              fontSize: isSmall ? "0.74rem" : "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: isSmall ? 3 : 5,
              transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isActive ? "scale(1.04)" : "scale(1)",
              boxShadow: isActive ? `0 2px 10px ${config.activeBg}` : "none",
            }}
          >
            <span style={{ fontSize: isSmall ? "0.85rem" : "1rem", lineHeight: 1 }}>{config.emoji}</span>
            {!isSmall && (
              <span className="reaction-label" style={{ opacity: isActive ? 1 : 0.85 }}>
                {config.label}
              </span>
            )}
            {countVal > 0 && (
              <span
                className="reaction-count-chip"
                style={{
                  background: isActive ? config.activeColor : "rgba(255, 255, 255, 0.12)",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  borderRadius: "10px",
                  padding: "0 5px",
                  fontSize: isSmall ? "0.68rem" : "0.73rem",
                  fontWeight: 700,
                  minWidth: 16,
                  textAlign: "center",
                }}
              >
                {countVal}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
