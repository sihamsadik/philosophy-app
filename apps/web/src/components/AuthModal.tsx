import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import type { User } from "@agora-server/contract";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, register, setDemoUser } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up Form State
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpName, setSignUpName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(signInEmail, signInPassword);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in. Please check credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await register({
        email: signUpEmail,
        password: signUpPassword,
        username: signUpUsername,
        name: signUpName,
      });
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = (philosopher: "sartre" | "spinoza" | "camus") => {
    const demoProfiles: Record<string, User> = {
      sartre: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Jean-Paul Sartre",
        username: "sartre",
        reputation: 150,
        philosophyProfile: {
          worldviewSummary: "Existence precedes essence. Freedom implies radical responsibility.",
          primarySchools: ["Existentialism", "Phenomenology"],
          keyThinkers: ["Martin Heidegger", "Edmund Husserl"],
          coreQuestions: ["How to live authentically without bad faith?"],
          favoriteTexts: ["Being and Nothingness"],
          connectionIntents: ["discussion", "intellectual"],
        },
      } as User,
      spinoza: {
        id: "00000000-0000-0000-0000-000000000002",
        name: "Baruch Spinoza",
        username: "spinoza",
        reputation: 210,
        philosophyProfile: {
          worldviewSummary: "Substance monism & nature under rational necessity.",
          primarySchools: ["Rationalism", "Determinism"],
          keyThinkers: ["Descartes", "Maimonides"],
          coreQuestions: ["Does free will exist under determinism?"],
          favoriteTexts: ["Ethics"],
          connectionIntents: ["discussion"],
        },
      } as User,
      camus: {
        id: "00000000-0000-0000-0000-000000000003",
        name: "Albert Camus",
        username: "camus",
        reputation: 180,
        philosophyProfile: {
          worldviewSummary: "Embracing the absurd with revolt, freedom, and passion.",
          primarySchools: ["Absurdism", "Existentialism"],
          keyThinkers: ["Nietzsche", "Kierkegaard"],
          coreQuestions: ["Is suicide the only serious philosophical problem?"],
          favoriteTexts: ["The Myth of Sisyphus"],
          connectionIntents: ["discussion", "friendship"],
        },
      } as User,
    };

    const targetUser = demoProfiles[philosopher];
    if (targetUser) {
      setDemoUser(targetUser);
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="auth-modal-pane" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>🏛️ Welcome to Agora Philosophy</h2>
          <p className="auth-modal-subtitle">
            Sign in or create your account to discover intellectual connections.
          </p>
          <button className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Auth Mode Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab-btn ${mode === "signin" ? "active" : ""}`}
            onClick={() => { setMode("signin"); setErrorMsg(null); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setErrorMsg(null); }}
          >
            Create Account
          </button>
        </div>

        {errorMsg && <div className="auth-error-alert">{errorMsg}</div>}

        {/* Sign In Form */}
        {mode === "signin" && (
          <form onSubmit={handleSignInSubmit} className="auth-form">
            <div className="form-group">
              <label className="section-label">Email Address</label>
              <input
                type="email"
                required
                className="input-text"
                placeholder="sartre@agora.org"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="section-label">Password</label>
              <input
                type="password"
                required
                className="input-text"
                placeholder="••••••••"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Sign In to Agora"}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === "signup" && (
          <form onSubmit={handleSignUpSubmit} className="auth-form">
            <div className="form-group">
              <label className="section-label">Full Display Name</label>
              <input
                type="text"
                required
                className="input-text"
                placeholder="Jean-Paul Sartre"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="section-label">Username Handle</label>
              <input
                type="text"
                required
                className="input-text"
                placeholder="sartre"
                value={signUpUsername}
                onChange={(e) => setSignUpUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="section-label">Email Address</label>
              <input
                type="email"
                required
                className="input-text"
                placeholder="sartre@agora.org"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="section-label">Password</label>
              <input
                type="password"
                required
                className="input-text"
                placeholder="••••••••"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Create Philosophical Account"}
            </button>
          </form>
        )}

        {/* Quick Demo Sign-In Buttons */}
        <div className="demo-users-section">
          <span className="demo-label">Instant Demo Profiles:</span>
          <div className="demo-buttons-row">
            <button
              type="button"
              className="demo-user-btn"
              onClick={() => handleDemoSignIn("sartre")}
            >
              👤 Sartre
            </button>
            <button
              type="button"
              className="demo-user-btn"
              onClick={() => handleDemoSignIn("spinoza")}
            >
              👤 Spinoza
            </button>
            <button
              type="button"
              className="demo-user-btn"
              onClick={() => handleDemoSignIn("camus")}
            >
              👤 Camus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
