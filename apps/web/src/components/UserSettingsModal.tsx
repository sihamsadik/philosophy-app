import React, { useState, useEffect } from "react";
import type { User, PhilosophyProfile, ConnectionIntent } from "@philosophy/contract";
import { agoraClient } from "../lib/api-client.js";

export interface UserSettingsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (updatedUser: User) => void;
}

const SAMPLE_AVATARS = [
  { name: "Sartre Photo", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" },
  { name: "Spinoza Photo", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" },
  { name: "Camus Photo", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" },
  { name: "Beauvoir Photo", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" },
];

const INTENTS: { id: ConnectionIntent; label: string; icon: string }[] = [
  { id: "discussion", label: "Discussions & Debates", icon: "💬" },
  { id: "intellectual", label: "Intellectual Growth", icon: "🧠" },
  { id: "friendship", label: "Philosophical Friendship", icon: "🤝" },
  { id: "dating", label: "Philosophical Dating", icon: "❤️" },
];

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"basic" | "worldview" | "intents">("basic");

  // Basic Info
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState("");

  // Worldview
  const [worldviewSummary, setWorldviewSummary] = useState("");
  const [primarySchools, setPrimarySchools] = useState<string[]>([]);
  const [keyThinkers, setKeyThinkers] = useState<string[]>([]);
  const [coreQuestions, setCoreQuestions] = useState<string[]>([]);
  const [favoriteTexts, setFavoriteTexts] = useState<string[]>([]);
  const [connectionIntents, setConnectionIntents] = useState<ConnectionIntent[]>([]);

  // Inputs
  const [newSchool, setNewSchool] = useState("");
  const [newThinker, setNewThinker] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newText, setNewText] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername(user.username || "");
      setAvatar(user.avatar || "");
      setBio(user.bio || "");

      const p = user.philosophyProfile;
      setWorldviewSummary(p?.worldviewSummary || "");
      setFavoriteQuote(p?.favoriteQuote || "");
      setQuoteAuthor(p?.quoteAuthor || "");
      setPrimarySchools(p?.primarySchools || ["Existentialism"]);
      setKeyThinkers(p?.keyThinkers || ["Friedrich Nietzsche"]);
      setCoreQuestions(p?.coreQuestions || []);
      setFavoriteTexts(p?.favoriteTexts || []);
      setConnectionIntents(p?.connectionIntents || ["discussion", "intellectual"]);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const toggleArrayItem = <T,>(list: T[], item: T): T[] => {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  };

  const addItem = (list: string[], item: string, clearInput: () => void) => {
    const trimmed = item.trim();
    if (trimmed && !list.includes(trimmed)) {
      list = [...list, trimmed];
      clearInput();
    }
    return list;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSaveStatus("Image file exceeds 5MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    // Auto-flush any pending typed inputs before saving
    let finalQuestions = [...coreQuestions];
    if (newQuestion.trim() && !finalQuestions.includes(newQuestion.trim())) {
      finalQuestions.push(newQuestion.trim());
      setCoreQuestions(finalQuestions);
      setNewQuestion("");
    }

    let finalSchools = [...primarySchools];
    if (newSchool.trim() && !finalSchools.includes(newSchool.trim())) {
      finalSchools.push(newSchool.trim());
      setPrimarySchools(finalSchools);
      setNewSchool("");
    }

    let finalThinkers = [...keyThinkers];
    if (newThinker.trim() && !finalThinkers.includes(newThinker.trim())) {
      finalThinkers.push(newThinker.trim());
      setKeyThinkers(finalThinkers);
      setNewThinker("");
    }

    let finalTexts = [...favoriteTexts];
    if (newText.trim() && !finalTexts.includes(newText.trim())) {
      finalTexts.push(newText.trim());
      setFavoriteTexts(finalTexts);
      setNewText("");
    }

    const updatedPhilosophyProfile: PhilosophyProfile = {
      worldviewSummary,
      favoriteQuote: favoriteQuote.trim() || null,
      quoteAuthor: quoteAuthor.trim() || null,
      primarySchools: finalSchools,
      keyThinkers: finalThinkers,
      coreQuestions: finalQuestions,
      favoriteTexts: finalTexts,
      connectionIntents,
    };

    try {
      const updatedUser = await agoraClient.updateUserProfile(user.id, {
        name,
        username,
        avatar,
        bio,
        philosophyProfile: updatedPhilosophyProfile,
      });

      setSaveStatus("Profile settings saved successfully!");
      if (onSaveSuccess) onSaveSuccess(updatedUser);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setSaveStatus(`Failed to save settings: ${err.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="settings-modal-pane" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <div className="avatar-preview-block">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="avatar-img-preview" />
            ) : (
              <div className="avatar-circle-large">
                {(name || username || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3>⚙️ GitHub/Telegram Style Profile Settings</h3>
              <p className="settings-subtitle">Customize your bio, photo, quote, and worldview identity.</p>
            </div>
          </div>
          <button className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === "basic" ? "active" : ""}`}
            onClick={() => setActiveTab("basic")}
          >
            👤 Basic Info & Quote
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === "worldview" ? "active" : ""}`}
            onClick={() => setActiveTab("worldview")}
          >
            📚 Worldview & Books
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === "intents" ? "active" : ""}`}
            onClick={() => setActiveTab("intents")}
          >
            ⚙️ Connection Intents
          </button>
        </div>

        <form onSubmit={handleSave} className="settings-form-body">
          {/* TAB 1: BASIC INFO & FAVORITE QUOTE */}
          {activeTab === "basic" && (
            <div className="tab-pane-content">
              <div className="form-group">
                <label className="section-label">Display Name</label>
                <input
                  type="text"
                  className="input-text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jean-Paul Sartre"
                />
              </div>

              <div className="form-group">
                <label className="section-label">Username Handle</label>
                <input
                  type="text"
                  className="input-text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. sartre"
                />
              </div>

              <div className="form-group">
                <label className="section-label">📷 Profile Photo / Avatar</label>
                
                <div style={{ display: "flex", gap: "10px", alignItems: "center", margin: "8px 0 12px 0" }}>
                  <label className="connect-btn" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    📁 Upload Photo from Device
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      className="remove-btn"
                      style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                      onClick={() => setAvatar("")}
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  className="input-text"
                  value={avatar.startsWith("data:") ? "[Uploaded Custom Photo]" : avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="Or paste photo image URL..."
                />

                <div className="sample-avatars-row" style={{ marginTop: 12 }}>
                  <span className="sample-label">Or pick sample thinker photo:</span>
                  <div className="avatar-pick-grid">
                    {SAMPLE_AVATARS.map((item, i) => (
                      <button
                        type="button"
                        key={i}
                        className={`avatar-pick-btn ${avatar === item.url ? "selected" : ""}`}
                        onClick={() => setAvatar(item.url)}
                      >
                        <img src={item.url} alt={item.name} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="section-label">Personal Bio</label>
                <textarea
                  className="input-textarea"
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about yourself and your philosophical journey..."
                />
              </div>

              {/* The Quote They Love */}
              <div className="form-group highlight-box">
                <label className="section-label">💬 Favorite Philosophical Quote You Love</label>
                <textarea
                  className="input-textarea"
                  rows={2}
                  value={favoriteQuote}
                  onChange={(e) => setFavoriteQuote(e.target.value)}
                  placeholder="e.g. He who has a why to live can bear almost any how."
                />
                <input
                  type="text"
                  className="input-text"
                  style={{ marginTop: 8 }}
                  value={quoteAuthor}
                  onChange={(e) => setQuoteAuthor(e.target.value)}
                  placeholder="Quote Author (e.g. Friedrich Nietzsche)"
                />
              </div>
            </div>
          )}

          {/* TAB 2: WORLDVIEW & RECOMMENDED BOOKS */}
          {activeTab === "worldview" && (
            <div className="tab-pane-content">
              <div className="form-group">
                <label className="section-label">Worldview Summary</label>
                <textarea
                  className="input-textarea"
                  rows={3}
                  value={worldviewSummary}
                  onChange={(e) => setWorldviewSummary(e.target.value)}
                  placeholder="Describe your fundamental perspective on reality, meaning, and agency..."
                />
              </div>

              {/* Recommended Books & Favorite Texts */}
              <div className="form-group">
                <label className="section-label">📚 Recommended Books & Key Texts</label>
                <ul className="question-list">
                  {favoriteTexts.map((text, idx) => (
                    <li key={idx} className="list-item">
                      <span>📖 {text}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => setFavoriteTexts(favoriteTexts.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="custom-add-bar">
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g. Being and Time, Ethics, The Myth of Sisyphus..."
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setFavoriteTexts(addItem(favoriteTexts, newText, () => setNewText("")));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => setFavoriteTexts(addItem(favoriteTexts, newText, () => setNewText("")))}
                  >
                    Add Book
                  </button>
                </div>
              </div>

              {/* Core Questions */}
              <div className="form-group">
                <label className="section-label">Core Philosophical Questions</label>
                <ul className="question-list">
                  {coreQuestions.map((q, idx) => (
                    <li key={idx} className="list-item">
                      <span>❓ "{q}"</span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => setCoreQuestions(coreQuestions.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="custom-add-bar">
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Add core question..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setCoreQuestions(addItem(coreQuestions, newQuestion, () => setNewQuestion("")));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => setCoreQuestions(addItem(coreQuestions, newQuestion, () => setNewQuestion("")))}
                  >
                    Add Question
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONNECTION INTENTS */}
          {activeTab === "intents" && (
            <div className="tab-pane-content">
              <div className="form-group">
                <label className="section-label">Your Active Connection Intents</label>
                <p className="intent-help-text">
                  Choose what type of connections you are seeking in the community:
                </p>
                <div className="intent-grid">
                  {INTENTS.map((intent) => {
                    const active = connectionIntents.includes(intent.id);
                    return (
                      <button
                        type="button"
                        key={intent.id}
                        className={`intent-card ${active ? "active" : ""}`}
                        onClick={() => setConnectionIntents(toggleArrayItem(connectionIntents, intent.id))}
                      >
                        <span className="intent-icon">{intent.icon}</span>
                        <span className="intent-label">{intent.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Save Action */}
          <div className="settings-actions">
            <button type="submit" className="save-submit-btn" disabled={isSaving}>
              {isSaving ? "Saving Settings..." : "Save Profile Settings"}
            </button>
            {saveStatus && <p className="status-feedback">{saveStatus}</p>}
          </div>
        </form>
      </div>
    </div>
  );
};
