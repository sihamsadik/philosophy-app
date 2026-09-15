import React from "react";

export interface PublicLandingDashboardProps {
  onOpenAuth: (mode: "signin" | "signup") => void;
}

export const PublicLandingDashboard: React.FC<PublicLandingDashboardProps> = ({ onOpenAuth }) => {
  return (
    <div className="landing-dashboard-container" style={{ padding: "20px 16px 60px 16px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Hero Banner */}
      <section className="landing-hero" style={{ textAlign: "center", padding: "48px 24px", background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)", borderRadius: 24, border: "1px solid rgba(255, 255, 255, 0.1)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", marginBottom: 40, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "inline-block", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 30, padding: "6px 18px", color: "#60a5fa", fontWeight: 600, fontSize: "0.85rem", marginBottom: 16 }}>
          🏛️ GLOBAL INTELLECTUAL ASSEMBLY & DIALECTIC HUB
        </div>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, color: "#f8fafc", margin: "12px 0", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          Where Deep Thinkers Debate, Connect & Discover Truth
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#94a3b8", maxWidth: 720, margin: "0 auto 28px auto", lineHeight: 1.6 }}>
          Agora brings together philosophers, ethicists, and rationalists. Explore structured arguments, participate in live symposiums, and measure worldview compatibility.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => onOpenAuth("signup")}
            style={{ padding: "14px 32px", borderRadius: 30, border: "none", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#ffffff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4)", transition: "transform 0.2s" }}
          >
            🚀 Create Free Account & Join Debate
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth("signin")}
            style={{ padding: "14px 28px", borderRadius: 30, border: "1px solid rgba(255, 255, 255, 0.2)", background: "rgba(255, 255, 255, 0.05)", color: "#f8fafc", fontWeight: 600, fontSize: "1rem", cursor: "pointer" }}
          >
            🔑 Sign In to Existing Account
          </button>
        </div>
      </section>

      {/* Live Debates & User Thoughts Teaser */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", color: "#f1f5f9", margin: 0 }}>📜 Trending Philosophical Arguments</h2>
            <p style={{ color: "#94a3b8", margin: "4px 0 0 0", fontSize: "0.9rem" }}>Preview arguments published by thinkers in the database.</p>
          </div>
          <button type="button" onClick={() => onOpenAuth("signin")} style={{ background: "none", border: "none", color: "#60a5fa", fontWeight: 600, cursor: "pointer" }}>
            Sign In to View All →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {/* Card 1 */}
          <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" alt="Spinoza" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                <div>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Baruch Spinoza</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>@spinoza • Rationalism & Monism</div>
                </div>
              </div>
              <h3 style={{ fontSize: "1.1rem", color: "#f8fafc", margin: "0 0 8px 0" }}>Hard Determinism vs. Compatibilism: Is Moral Agency an Illusion?</h3>
              <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                "If every physical state of the universe is determined by prior causes, how can moral responsibility exist without radical non-physical agent causation?"
              </p>
            </div>
            <button type="button" onClick={() => onOpenAuth("signup")} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)", color: "#60a5fa", fontWeight: 600, cursor: "pointer" }}>
              💬 Sign In to Join Debate
            </button>
          </div>

          {/* Card 2 */}
          <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80" alt="Camus" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                <div>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Albert Camus</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>@camus • Absurdism</div>
                </div>
              </div>
              <h3 style={{ fontSize: "1.1rem", color: "#f8fafc", margin: "0 0 8px 0" }}>The Myth of Sisyphus: Creating Meaning in an Absurd Universe</h3>
              <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                "The absurd is born of this confrontation between human need and the silent world. One must imagine Sisyphus happy."
              </p>
            </div>
            <button type="button" onClick={() => onOpenAuth("signup")} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)", color: "#60a5fa", fontWeight: 600, cursor: "pointer" }}>
              💬 Sign In to Join Debate
            </button>
          </div>

          {/* Card 3 */}
          <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80" alt="Kant" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                <div>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Immanuel Kant</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>@kantian_critique • Deontology</div>
                </div>
              </div>
              <h3 style={{ fontSize: "1.1rem", color: "#f8fafc", margin: "0 0 8px 0" }}>The Categorical Imperative: Maxims of Universal Law</h3>
              <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                "Act so that the maxim of your will could always hold at the same time as a principle of universal legislation."
              </p>
            </div>
            <button type="button" onClick={() => onOpenAuth("signup")} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)", color: "#60a5fa", fontWeight: 600, cursor: "pointer" }}>
              💬 Sign In to Join Debate
            </button>
          </div>
        </div>
      </section>

      {/* Featured Live Symposiums */}
      <section style={{ marginBottom: 48, background: "rgba(15, 23, 42, 0.6)", borderRadius: 20, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: "1.5rem" }}>🏛️</span>
          <div>
            <h2 style={{ fontSize: "1.3rem", color: "#f8fafc", margin: 0 }}>Upcoming Live Symposiums & Formal Debates</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "2px 0 0 0" }}>Schedule & RSVP to voice your perspectives in audio/video dialogues.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={{ background: "rgba(30, 41, 59, 0.8)", padding: 16, borderRadius: 14, borderLeft: "4px solid #ef4444" }}>
            <span style={{ fontSize: "0.75rem", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>🔴 LIVE NOW</span>
            <h4 style={{ color: "#f8fafc", margin: "8px 0 4px 0", fontSize: "1rem" }}>🌌 Transcendental Idealism Symposium</h4>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 12px 0" }}>Host: Immanuel Kant • 18 Attendees</p>
            <button type="button" onClick={() => onOpenAuth("signin")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
              Sign In to Attend
            </button>
          </div>

          <div style={{ background: "rgba(30, 41, 59, 0.8)", padding: 16, borderRadius: 14, borderLeft: "4px solid #3b82f6" }}>
            <span style={{ fontSize: "0.75rem", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>📅 TOMORROW</span>
            <h4 style={{ color: "#f8fafc", margin: "8px 0 4px 0", fontSize: "1rem" }}>⚔️ Compatibilism vs. Determinism Formal Debate</h4>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 12px 0" }}>Host: Baruch Spinoza • 42 Attendees</p>
            <button type="button" onClick={() => onOpenAuth("signin")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
              Sign In to RSVP
            </button>
          </div>
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
