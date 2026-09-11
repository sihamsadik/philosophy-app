import React from "react";

export type NavTab = "debates" | "spaces" | "recommendations" | "symposiums" | "leaderboard" | "profile" | "search";

export interface BottomNavDockProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadNotifCount?: number;
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeTab,
  onTabChange,
  unreadNotifCount = 0,
}) => {
  const tabs: { id: NavTab; label: string; icon: string }[] = [
    { id: "debates", label: "Home", icon: "🏠" },
    { id: "spaces", label: "Circles", icon: "🏛️" },
    { id: "recommendations", label: "Peers", icon: "🤝" },
    { id: "symposiums", label: "Events", icon: "📅" },
    { id: "leaderboard", label: "Ranks", icon: "🏆" },
    { id: "profile", label: "Profile", icon: "👤" },
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
                <span className="dock-icon">{tab.icon}</span>
                {tab.id === "recommendations" && unreadNotifCount > 0 && (
                  <span className="dock-badge-dot" />
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
