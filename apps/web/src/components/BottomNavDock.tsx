import React from "react";
import { House, Landmark, Handshake, CalendarDays, Trophy, User } from "lucide-react";

export type NavTab = "debates" | "spaces" | "recommendations" | "symposiums" | "leaderboard" | "profile" | "search";

export interface BottomNavDockProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadNotifCount?: number;
  hasCircleMessages?: boolean;
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeTab,
  onTabChange,
  unreadNotifCount = 0,
  hasCircleMessages = false,
}) => {
  const tabIcons: Record<NavTab, React.ReactNode> = {
    debates: <House size={20} />,
    spaces: <Landmark size={20} />,
    recommendations: <Handshake size={20} />,
    symposiums: <CalendarDays size={20} />,
    leaderboard: <Trophy size={20} />,
    profile: <User size={20} />,
    search: <User size={20} />,
  };
  const tabs: { id: NavTab; label: string }[] = [
    { id: "debates", label: "Home" },
    { id: "spaces", label: "Circles" },
    { id: "recommendations", label: "Peers" },
    { id: "symposiums", label: "Events" },
    { id: "leaderboard", label: "Ranks" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <nav className="bottom-nav-dock">
      <div className="bottom-dock-inner">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`dock-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              <div className="dock-icon-wrapper">
                <span className="dock-icon">{tabIcons[tab.id]}</span>
                {tab.id === "recommendations" && unreadNotifCount > 0 && (
                  <span className="dock-badge-dot" title="New peer connection requests" />
                )}
                {tab.id === "spaces" && hasCircleMessages && (
                  <span className="dock-badge-dot" title="New activity in your joined circles" />
                )}
              </div>
              <span className="dock-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
