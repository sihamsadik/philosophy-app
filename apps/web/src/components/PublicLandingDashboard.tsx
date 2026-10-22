import React, { useEffect, useState } from "react";
import { Landmark, UserPlus, LogIn, ScrollText, MessageCircle, ThumbsUp, Calendar, Radio } from "lucide-react";
import { agoraClient, type PhilosophicalPost, type PhilosophyEvent } from "../lib/api-client.js";

export interface PublicLandingDashboardProps {
  onOpenAuth: (mode: "signin" | "signup") => void;
}

export const PublicLandingDashboard: React.FC<PublicLandingDashboardProps> = ({ onOpenAuth }) => {
  const [trendingPosts, setTrendingPosts] = useState<PhilosophicalPost[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<PhilosophyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      agoraClient.getPosts().catch(() => ({ posts: [] })),
      agoraClient.getEvents({ timeWindow: "upcoming" }).catch(() => ({ events: [] }))
    ]).then(([postsRes, eventsRes]) => {
      if (!mounted) return;
      const sortedPosts = [...(postsRes.posts || [])].sort((a, b) => b.upvotesCount - a.upvotesCount).slice(0, 3);
      const sortedEvents = [...(eventsRes.events || [])].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 2);
      
      setTrendingPosts(sortedPosts);
      setUpcomingEvents(sortedEvents);
      setIsLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="landing-dashboard-container" style={{ padding: "20px 16px 30px 16px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Hero Banner */}
      <section className="landing-hero" style={{ textAlign: "center", padding: "32px 16px", background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)", borderRadius: 24, border: "1px solid rgba(255, 255, 255, 0.1)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", marginBottom: 20, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "inline-block", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 30, padding: "6px 18px", color: "#60a5fa", fontWeight: 600, fontSize: "0.85rem", marginBottom: 16 }}>
          <Landmark size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> GLOBAL INTELLECTUAL ASSEMBLY & DIALECTIC HUB
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#f8fafc", margin: "12px 0", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          Where Deep Thinkers Debate, Connect & Discover Truth
        </h1>
        <p style={{ fontSize: "0.95rem", color: "#94a3b8", maxWidth: 720, margin: "0 auto 28px auto", lineHeight: 1.6 }}>
          Agora brings together philosophers, ethicists, and rationalists. Explore structured arguments, participate in live symposiums, and measure worldview compatibility.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => onOpenAuth("signup")}
            style={{ padding: "12px 24px", borderRadius: 30, border: "none", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#ffffff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4)", transition: "transform 0.2s" }}
          >
            <UserPlus size={16} style={{ marginRight: 8, verticalAlign: "middle" }} /> Create Free Account & Join Debate
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth("signin")}
            style={{ padding: "12px 20px", borderRadius: 30, border: "1px solid rgba(255, 255, 255, 0.2)", background: "rgba(255, 255, 255, 0.05)", color: "#f8fafc", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
          >
            <LogIn size={16} style={{ marginRight: 8, verticalAlign: "middle" }} /> Sign In to Existing Account
          </button>
        </div>
      </section>

      {/* Live Debates & User Thoughts Teaser */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: 8 }}><ScrollText size={22} /> Trending Philosophical Arguments</h2>
            <p style={{ color: "#94a3b8", margin: "4px 0 0 0", fontSize: "0.9rem" }}>Preview arguments published by thinkers in the database.</p>
          </div>
          <button type="button" onClick={() => onOpenAuth("signin")} style={{ background: "none", border: "none", color: "#60a5fa", fontWeight: 600, cursor: "pointer" }}>
            Sign In to View All →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {isLoading ? (
            <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32, gridColumn: "1 / -1", textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0 }}>Loading trending arguments...</p>
            </div>
          ) : trendingPosts.length === 0 ? (
            <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32, gridColumn: "1 / -1", textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0 }}>No trending arguments at the moment. Be the first to publish a philosophical thesis!</p>
            </div>
          ) : (
            trendingPosts.map((post) => (
              <div key={post.id} style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt={post.authorName} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold" }}>
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, color: "#f8fafc" }}>{post.authorName}</div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>@{post.authorHandle} • {post.primarySchool}</div>
                    </div>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", color: "#f8fafc", margin: "0 0 8px 0" }}>{post.title}</h3>
                  <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                    "{post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content}"
                  </p>
                </div>
                <button type="button" onClick={() => onOpenAuth("signup")} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)", color: "#60a5fa", fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}><MessageCircle size={15} /> Sign In to Join Debate</span>
                  <span style={{ fontSize: "0.85rem", opacity: 0.8, display: "flex", alignItems: "center", gap: 4 }}><ThumbsUp size={13} /> {post.upvotesCount}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Featured Live Symposiums */}
      <section style={{ marginBottom: 48, background: "rgba(15, 23, 42, 0.6)", borderRadius: 20, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Landmark size={24} color="#60a5fa" />
          <div>
            <h2 style={{ fontSize: "1.3rem", color: "#f8fafc", margin: 0 }}>Upcoming Live Symposiums & Formal Debates</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "2px 0 0 0" }}>Schedule & RSVP to voice your perspectives in audio/video dialogues.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {isLoading ? (
            <div style={{ background: "rgba(30, 41, 59, 0.8)", padding: 16, borderRadius: 14, gridColumn: "1 / -1", textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>Loading live symposiums...</p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div style={{ background: "rgba(30, 41, 59, 0.8)", padding: 16, borderRadius: 14, gridColumn: "1 / -1", textAlign: "center" }}>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>No live symposiums scheduled at the moment. Sign in to host your own!</p>
            </div>
          ) : (
            upcomingEvents.map((event) => {
              const startDate = new Date(event.startTime);
              const isLive = new Date() >= startDate && (!event.endTime || new Date() <= new Date(event.endTime));
              return (
                <div key={event.id} style={{ background: "rgba(30, 41, 59, 0.8)", padding: 16, borderRadius: 14, borderLeft: `4px solid ${isLive ? '#ef4444' : '#3b82f6'}` }}>
                  <span style={{ fontSize: "0.75rem", background: isLive ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)", color: isLive ? "#f87171" : "#60a5fa", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                    {isLive ? <><Radio size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />LIVE NOW</> : <><Calendar size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />{startDate.toLocaleDateString()}</>}
                  </span>
                  <h4 style={{ color: "#f8fafc", margin: "8px 0 4px 0", fontSize: "1rem" }}>{event.title}</h4>
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 12px 0" }}>Host: {event.hostUser?.name || event.hostUser?.username || "Thinker"} • {event.maxCapacity || 0} Capacity</p>
                  <button type="button" onClick={() => onOpenAuth("signin")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: isLive ? "#ef4444" : "#3b82f6", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
                    Sign In to {isLive ? "Attend" : "RSVP"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section style={{ textAlign: "center", padding: "36px 20px", background: "linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(30, 58, 138, 0.3) 100%)", borderRadius: 20, border: "1px solid rgba(59, 130, 246, 0.3)" }}>
        <h2 style={{ fontSize: "1.6rem", color: "#f8fafc", margin: "0 0 8px 0" }}>Ready to share your philosophical perspective?</h2>
        <p style={{ color: "#cbd5e1", maxWidth: 600, margin: "0 auto 20px auto", fontSize: "0.95rem" }}>
          Create a free account or sign in to publish arguments, join philosophical circles, and participate in live symposiums.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <button type="button" onClick={() => onOpenAuth("signup")} style={{ padding: "12px 28px", borderRadius: 24, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
            Sign Up Now
          </button>
          <button type="button" onClick={() => onOpenAuth("signin")} style={{ padding: "12px 24px", borderRadius: 24, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" }}>
            Sign In
          </button>
        </div>
      </section>
    </div>
  );
};
