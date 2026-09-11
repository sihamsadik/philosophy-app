import React from "react";
import type { User } from "@agora-server/contract";

export interface MomentsCarouselProps {
  currentUser?: User | null;
  onOpenComposer: () => void;
  onSelectThinker?: (user: User) => void;
}

const DEMO_MOMENT_THINKERS = [
  {
    id: "usr-sartre-001",
    name: "Jean-Paul Sartre",
    username: "sartre",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
    hasActiveMoment: true,
  },
  {
    id: "usr-hypatia-002",
    name: "Hypatia of Alexandria",
    username: "hypatia",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
    hasActiveMoment: true,
  },
  {
    id: "usr-spinoza-003",
    name: "Baruch Spinoza",
    username: "spinoza",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
    hasActiveMoment: false,
  },
  {
    id: "usr-nietzsche-004",
    name: "Friedrich Nietzsche",
    username: "nietzsche",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    hasActiveMoment: true,
  },
  {
    id: "usr-kierkegaard-005",
    name: "Søren Kierkegaard",
    username: "kierkegaard",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&q=80",
    hasActiveMoment: false,
  },
];

export const MomentsCarousel: React.FC<MomentsCarouselProps> = ({
  currentUser,
  onOpenComposer,
  onSelectThinker,
}) => {
  return (
    <div className="moments-carousel-wrapper">
      <div className="moments-scroll-container">
        {/* Add Moment Item */}
        <div className="moment-item" onClick={onOpenComposer}>
          <div className="moment-avatar-ring add-moment-ring">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="User Avatar" className="moment-avatar-img" />
            ) : (
              <div className="moment-avatar-placeholder">
                {(currentUser?.name || currentUser?.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="add-moment-badge">+</div>
          </div>
          <span className="moment-label">Add moment</span>
        </div>

        {/* Thinkers Moments List */}
        {DEMO_MOMENT_THINKERS.map((thinker) => (
          <div
            key={thinker.id}
            className="moment-item"
            onClick={() =>
              onSelectThinker &&
              onSelectThinker({
                id: thinker.id,
                name: thinker.name,
                username: thinker.username,
                avatar: thinker.avatar,
              } as User)
            }
          >
            <div className={`moment-avatar-ring ${thinker.hasActiveMoment ? "active-ring" : "inactive-ring"}`}>
              <img src={thinker.avatar} alt={thinker.name} className="moment-avatar-img" />
            </div>
            <span className="moment-label">{thinker.name.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
