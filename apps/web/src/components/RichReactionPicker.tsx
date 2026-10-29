import React, { useState, useEffect, useRef } from "react";
import { agoraClient } from "../lib/api-client.js";
import { ThumbsUp, Heart, Lightbulb, Smile, ThumbsDown } from "lucide-react";

export type ReactionType = "love" | "upvote" | "wow" | "funny" | "downvote";

export interface ReactionConfig {
  key: ReactionType;
  icon: React.ElementType;
  label: string;
  pointsLabel: string;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}

export const REACTION_CONFIGS: ReactionConfig[] = [
  {
    key: "upvote",
    icon: ThumbsUp,
    label: "Like",
    pointsLabel: "+1 Rep",
    activeColor: "#0a66c2",
    activeBg: "rgba(10, 102, 194, 0.12)",
    activeBorder: "rgba(10, 102, 194, 0.4)",
  },
  {
    key: "love",
    icon: Heart,
    label: "Love",
    pointsLabel: "+2 Rep",
    activeColor: "#df4f48",
    activeBg: "rgba(223, 79, 72, 0.12)",
    activeBorder: "rgba(223, 79, 72, 0.4)",
  },
  {
    key: "wow",
    icon: Lightbulb,
    label: "Insightful",
    pointsLabel: "+1 Rep",
    activeColor: "#e7a33e",
    activeBg: "rgba(231, 163, 62, 0.12)",
    activeBorder: "rgba(231, 163, 62, 0.4)",
  },
  {
    key: "funny",
    icon: Smile,
    label: "Wit",
    pointsLabel: "+1 Rep",
    activeColor: "#44b35c",
    activeBg: "rgba(68, 179, 92, 0.12)",
    activeBorder: "rgba(68, 179, 92, 0.4)",
  },
  {
    key: "downvote",
    icon: ThumbsDown,
    label: "Thoughtful",
    pointsLabel: "0 Rep",
    activeColor: "#8f5ccf",
    activeBg: "rgba(143, 92, 207, 0.12)",
    activeBorder: "rgba(143, 92, 207, 0.4)",
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
  const [showPopover, setShowPopover] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActiveReaction(userReaction);
  }, [userReaction]);

  useEffect(() => {
    setCounts({ ...reactionCounts });
  }, [JSON.stringify(reactionCounts)]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

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
    setShowPopover(false);
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

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowPopover(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowPopover(false);
      setHoveredIcon(null);
    }, 400);
  };

  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If already reacted, toggle it off. Otherwise default to "upvote" (Like).
    if (activeReaction) {
      handleToggleReaction(activeReaction as ReactionType);
    } else {
      handleToggleReaction("upvote");
    }
  };

  const activeConfig = activeReaction
    ? REACTION_CONFIGS.find((c) => c.key === activeReaction)
    : null;

  const totalCount = Object.values(counts).reduce((a, b) => a + (b || 0), 0);

  // Build the top icons summary strip (like LinkedIn shows overlapping icon bubbles)
  const topIcons = REACTION_CONFIGS
    .filter((c) => (counts[c.key] || 0) > 0)
    .sort((a, b) => (counts[b.key] || 0) - (counts[a.key] || 0))
    .slice(0, 3);

  const isSmall = size === "sm";
  const iconSizePopover = isSmall ? 18 : 22;
  const iconSizePrimary = isSmall ? 14 : 16;
  const iconSizeSummary = isSmall ? 10 : 12;

  return (
    <div
      ref={containerRef}
      className="linkedin-reaction-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? 6 : 8,
      }}
    >
      {/* ─── Floating Icon Popover ─── */}
      <div
        className={`linkedin-reaction-popover ${showPopover ? "visible" : ""}`}
        style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: 0,
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 28,
          padding: "6px 8px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25)",
          opacity: showPopover ? 1 : 0,
          transform: showPopover ? "translateY(0) scale(1)" : "translateY(8px) scale(0.9)",
          transition: "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          pointerEvents: showPopover ? "auto" : "none",
          zIndex: 1000,
          whiteSpace: "nowrap",
        }}
      >
        {REACTION_CONFIGS.map((config, index) => {
          const isThis = activeReaction === config.key;
          const isHovered = hoveredIcon === config.key;
          const IconComponent = config.icon;
          return (
            <button
              key={config.key}
              type="button"
              className="linkedin-emoji-btn"
              title={`${config.label} (${config.pointsLabel})`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleReaction(config.key);
              }}
              onMouseEnter={() => setHoveredIcon(config.key)}
              onMouseLeave={() => setHoveredIcon(null)}
              style={{
                background: isThis ? config.activeBg : "transparent",
                border: "none",
                borderRadius: "50%",
                width: isSmall ? 36 : 42,
                height: isSmall ? 36 : 42,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: isThis || isHovered ? config.activeColor : "#94a3b8",
                transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease, color 0.15s ease",
                transform: showPopover
                  ? `scale(${isHovered ? 1.45 : isThis ? 1.1 : 1})`
                  : "scale(0)",
                transitionDelay: showPopover ? `${index * 40}ms` : "0ms",
                position: "relative",
              }}
            >
              <IconComponent
                size={iconSizePopover}
                fill={isThis ? config.activeColor : "none"}
                strokeWidth={isThis ? 2.5 : 2}
              />
            </button>
          );
        })}

        {/* Tooltip label for hovered icon */}
        <div
          className="emoji-tooltip-label"
          style={{
            position: "absolute",
            top: "-28px",
            left: "50%",
            transform: `translateX(-50%) ${hoveredIcon ? "translateY(0) scale(1)" : "translateY(4px) scale(0.85)"}`,
            background: "rgba(0, 0, 0, 0.85)",
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 12,
            whiteSpace: "nowrap",
            opacity: hoveredIcon ? 1 : 0,
            transition: "all 0.15s ease",
            pointerEvents: "none",
            letterSpacing: "0.02em",
          }}
        >
          {hoveredIcon ? REACTION_CONFIGS.find((c) => c.key === hoveredIcon)?.label : ""}
        </div>
      </div>

      {/* ─── Primary "Like" Button (LinkedIn Style) ─── */}
      <button
        type="button"
        className={`linkedin-like-btn ${activeReaction ? "active" : ""}`}
        onClick={handlePrimaryClick}
        style={{
          background: "none",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: isSmall ? 4 : 6,
          cursor: "pointer",
          padding: isSmall ? "4px 8px" : "6px 10px",
          borderRadius: 6,
          transition: "background 0.15s ease",
          color: activeConfig ? activeConfig.activeColor : "#94a3b8",
          fontWeight: 700,
          fontSize: isSmall ? "0.78rem" : "0.85rem",
        }}
      >
        {activeConfig ? (
          <activeConfig.icon
            size={iconSizePrimary}
            fill={activeConfig.activeColor}
            strokeWidth={2.5}
            style={{ transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          />
        ) : (
          <ThumbsUp size={iconSizePrimary} />
        )}
        <span>{activeConfig ? activeConfig.label : "Like"}</span>
      </button>

      {/* ─── Aggregated Count Display (LinkedIn overlapping icon bubbles) ─── */}
      {totalCount > 0 && (
        <div
          className="linkedin-reaction-summary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            cursor: "default",
            padding: "2px 0",
          }}
        >
          {/* Overlapping icon circles */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: "row-reverse",
            }}
          >
            {topIcons.map((config, i) => {
              const IconComp = config.icon;
              return (
                <span
                  key={config.key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: isSmall ? 18 : 22,
                    height: isSmall ? 18 : 22,
                    borderRadius: "50%",
                    background: config.activeBg,
                    border: "2px solid rgba(15, 23, 42, 0.9)",
                    color: config.activeColor,
                    marginRight: i > 0 ? (isSmall ? -6 : -7) : 0,
                    zIndex: topIcons.length - i,
                    position: "relative",
                  }}
                >
                  <IconComp size={iconSizeSummary} fill={config.activeColor} strokeWidth={2.5} />
                </span>
              );
            })}
          </div>

          {/* Total count */}
          <span
            style={{
              fontSize: isSmall ? "0.73rem" : "0.82rem",
              fontWeight: 600,
              color: "#94a3b8",
              marginLeft: 2,
            }}
          >
            {totalCount}
          </span>
        </div>
      )}
    </div>
  );
};
