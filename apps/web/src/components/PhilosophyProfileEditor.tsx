import React, { useState } from "react";
import type { User, PhilosophyProfile, ConnectionIntent } from "@philosophy/contract";
import { agoraClient } from "../lib/api-client.js";

const POPULAR_SCHOOLS = [
  "Existentialism",
  "Stoicism",
  "Rationalism",
  "Phenomenology",
  "Determinism",
  "Compatibilism",
  "Utilitarianism",
  "Virtue Ethics",
];

const POPULAR_THINKERS = [
  "Friedrich Nietzsche",
  "Albert Camus",
  "Baruch Spinoza",
  "Immanuel Kant",
  "Simone de Beauvoir",
  "Martin Heidegger",
  "Jean-Paul Sartre",
  "Maurice Merleau-Ponty",
];

const INTENTS: { id: ConnectionIntent; label: string; icon: string }[] = [
  { id: "discussion", label: "Discussions & Debates", icon: "💬" },
  { id: "intellectual", label: "Intellectual Growth", icon: "🧠" },
  { id: "friendship", label: "Philosophical Friendship", icon: "🤝" },
  { id: "dating", label: "Philosophical Dating", icon: "❤️" },
];

export interface PhilosophyProfileEditorProps {
  userId: string;
  initialProfile?: PhilosophyProfile | null;
  user?: User | null;
  onSaveSuccess?: (updatedProfile: PhilosophyProfile) => void;
}

export const PhilosophyProfileEditor: React.FC<PhilosophyProfileEditorProps> = ({
  userId,
  initialProfile,
  user,
  onSaveSuccess,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const [worldviewSummary, setWorldviewSummary] = useState(initialProfile?.worldviewSummary || "");
  const [favoriteQuote, setFavoriteQuote] = useState(initialProfile?.favoriteQuote || "");
  const [quoteAuthor, setQuoteAuthor] = useState(initialProfile?.quoteAuthor || "");
  const [primarySchools, setPrimarySchools] = useState<string[]>(initialProfile?.primarySchools || ["Existentialism"]);
  const [keyThinkers, setKeyThinkers] = useState<string[]>(initialProfile?.keyThinkers || ["Friedrich Nietzsche"]);
  const [coreQuestions, setCoreQuestions] = useState<string[]>(initialProfile?.coreQuestions || []);
  const [favoriteTexts, setFavoriteTexts] = useState<string[]>(initialProfile?.favoriteTexts || []);
  const [connectionIntents, setConnectionIntents] = useState<ConnectionIntent[]>(
    initialProfile?.connectionIntents || ["discussion", "intellectual"]
  );

  const [newSchool, setNewSchool] = useState("");
  const [newThinker, setNewThinker] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newText, setNewText] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Sync state if initialProfile or user updates
  React.useEffect(() => {
    const prof = user?.philosophyProfile || initialProfile;
    if (prof) {
      if (prof.worldviewSummary !== undefined && prof.worldviewSummary !== null) {
        setWorldviewSummary(prof.worldviewSummary);
      }
      if (prof.favoriteQuote !== undefined && prof.favoriteQuote !== null) {
        setFavoriteQuote(prof.favoriteQuote);
      }
      if (prof.quoteAuthor !== undefined && prof.quoteAuthor !== null) {
        setQuoteAuthor(prof.quoteAuthor);
      }
      if (prof.primarySchools?.length) setPrimarySchools(prof.primarySchools);
      if (prof.keyThinkers?.length) setKeyThinkers(prof.keyThinkers);
      if (prof.coreQuestions?.length) setCoreQuestions(prof.coreQuestions);
      if (prof.favoriteTexts?.length) setFavoriteTexts(prof.favoriteTexts);
      if (prof.connectionIntents?.length) setConnectionIntents(prof.connectionIntents);
    }
  }, [initialProfile, user]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    // Auto-flush any typed pending inputs before saving
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

    const payload: PhilosophyProfile = {
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
      await agoraClient.updatePhilosophyProfile(userId, payload);
      setSaveStatus("Worldview profile saved successfully!");
      if (onSaveSuccess) onSaveSuccess(payload);
      setIsEditing(false); // Return to View mode after successful save
    } catch (err: any) {
      setSaveStatus(`Failed to save profile: ${err.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // VIEW MODE (Read-only Professional Profile)
  // ---------------------------------------------------------------------------
  if (!isEditing) {
    const displayName = user?.name || user?.username || "Philosophical Thinker";
    const handleTag = user?.username ? `@${user.username}` : "@thinker";
    const userBio = user?.bio || "Exploring foundational questions of existence, mind, and agency.";
    const userAvatar = user?.avatar;
    const reputation = user?.reputation ?? 150;

    return (
      <div className="philosophy-profile-view-container">
        {/* Profile Cover / Header Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-banner" />
          <div className="profile-hero-content">
            <div className="profile-hero-left">
              <div className="profile-avatar-large">
                {userAvatar ? (
                  <img src={userAvatar} alt={displayName} className="avatar-img-full" />
                ) : (
                  <div className="avatar-placeholder-large">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-user-details">
                <div className="profile-name-row">
                  <h1 className="profile-display-name">{displayName}</h1>
                  <span className="profile-reputation-badge" title="Philosophy Reputation Score">
                    ⚡ {reputation} Rep
                  </span>
                </div>
                <p className="profile-handle-text">{handleTag}</p>
                <p className="profile-bio-text">{userBio}</p>
              </div>
            </div>

            <div className="profile-hero-actions">
              <button
                type="button"
                className="edit-profile-action-btn"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Favorite Quote Section */}
        {favoriteQuote && (
          <div className="profile-section-card">
            <div className="section-card-header">
              <h3>💬 Favorite Philosophical Quote</h3>
            </div>
            <div className="worldview-quote-box" style={{ borderLeftColor: "#a855f7" }}>
              <p className="quote-text">"{favoriteQuote}"</p>
              {quoteAuthor && (
                <p style={{ marginTop: 8, color: "#a5b4fc", fontWeight: 600, fontSize: "0.92rem", fontStyle: "normal" }}>
                  — {quoteAuthor}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Worldview Summary Section */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <h3>🧠 Personal Worldview & Stance</h3>
          </div>
          <div className="worldview-quote-box">
            {worldviewSummary ? (
              <p className="quote-text">"{worldviewSummary}"</p>
            ) : (
              <p className="empty-section-hint">
                No worldview summary added yet. Click <strong>Edit Profile</strong> to share your philosophical perspective!
              </p>
            )}
          </div>
        </div>

        {/* Primary Schools & Thinkers Grid */}
        <div className="profile-two-col-grid">
          {/* Schools of Thought */}
          <div className="profile-section-card">
            <div className="section-card-header">
              <h3>🏛️ Primary Schools of Thought</h3>
            </div>
            <div className="profile-chip-group">
              {primarySchools.length > 0 ? (
                primarySchools.map((school) => (
                  <span key={school} className="profile-school-chip">
                    ✓ {school}
                  </span>
                ))
              ) : (
                <p className="empty-section-hint">No schools selected yet.</p>
              )}
            </div>
          </div>

          {/* Key Thinkers */}
          <div className="profile-section-card">
            <div className="section-card-header">
              <h3>📜 Influential Thinkers</h3>
            </div>
            <div className="profile-chip-group">
              {keyThinkers.length > 0 ? (
                keyThinkers.map((thinker) => (
                  <span key={thinker} className="profile-thinker-chip">
                    ★ {thinker}
                  </span>
                ))
              ) : (
                <p className="empty-section-hint">No thinkers added yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Core Questions Section */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <h3>❓ Core Philosophical Inquiries</h3>
          </div>
          {coreQuestions.length > 0 ? (
            <div className="questions-card-list">
              {coreQuestions.map((q, idx) => (
                <div key={idx} className="question-display-item">
                  <span className="question-icon font-mono">?</span>
                  <span className="question-text">"{q}"</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-section-hint">No core questions listed yet.</p>
          )}
        </div>

        {/* Favorite Texts & Works */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <h3>📖 Favorite Philosophical Texts</h3>
          </div>
          {favoriteTexts.length > 0 ? (
            <div className="profile-chip-group">
              {favoriteTexts.map((text, idx) => (
                <span key={idx} className="profile-text-chip">
                  📖 {text}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-section-hint">No favorite texts listed yet.</p>
          )}
        </div>

        {/* Connection Intents */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <h3>🤝 Connection Intents</h3>
          </div>
          <div className="intents-view-grid">
            {INTENTS.map((intent) => {
              const isActive = connectionIntents.includes(intent.id);
              return (
                <div key={intent.id} className={`intent-view-badge ${isActive ? "active" : "inactive"}`}>
                  <span className="intent-icon">{intent.icon}</span>
                  <span className="intent-label">{intent.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // EDIT MODE (Form)
  // ---------------------------------------------------------------------------
  return (
    <div className="philosophy-editor-card">
      <div className="editor-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>✏️ Edit Philosophical Identity & Worldview</h2>
          <p className="editor-subtitle">
            Update your foundational schools of thought, favorite thinkers, and core inquiries.
          </p>
        </div>
        <button
          type="button"
          className="back-to-profile-btn"
          onClick={() => setIsEditing(false)}
        >
          ← Back to Profile
        </button>
      </div>

      <form onSubmit={handleSave} className="editor-form">
        {/* Worldview Summary */}
        <div className="form-section">
          <label className="section-label">Personal Worldview Summary</label>
          <textarea
            className="input-textarea"
            rows={3}
            value={worldviewSummary}
            onChange={(e) => setWorldviewSummary(e.target.value)}
            placeholder="Describe how you see the world, agency, meaning, and morality..."
          />
        </div>

        {/* Favorite Quote & Author */}
        <div className="form-section">
          <label className="section-label">Favorite Philosophical Quote & Author</label>
          <textarea
            className="input-textarea"
            rows={2}
            value={favoriteQuote}
            onChange={(e) => setFavoriteQuote(e.target.value)}
            placeholder="e.g. Man is condemned to be free..."
          />
          <input
            type="text"
            className="input-text"
            style={{ marginTop: 10 }}
            placeholder="Quote Author (e.g. Jean-Paul Sartre)"
            value={quoteAuthor}
            onChange={(e) => setQuoteAuthor(e.target.value)}
          />
        </div>

        {/* Primary Schools of Thought */}
        <div className="form-section">
          <label className="section-label">Primary Schools of Thought</label>
          <div className="pill-grid">
            {POPULAR_SCHOOLS.map((school) => {
              const active = primarySchools.includes(school);
              return (
                <button
                  type="button"
                  key={school}
                  className={`pill-btn ${active ? "active" : ""}`}
                  onClick={() => setPrimarySchools(toggleArrayItem(primarySchools, school))}
                >
                  {active ? "✓ " : "+ "}
                  {school}
                </button>
              );
            })}
          </div>

          <div className="custom-add-bar">
            <input
              type="text"
              className="input-text"
              placeholder="Add custom school..."
              value={newSchool}
              onChange={(e) => setNewSchool(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setPrimarySchools(addItem(primarySchools, newSchool, () => setNewSchool("")));
                }
              }}
            />
            <button
              type="button"
              className="add-btn"
              onClick={() => setPrimarySchools(addItem(primarySchools, newSchool, () => setNewSchool("")))}
            >
              Add
            </button>
          </div>
        </div>

        {/* Key Thinkers */}
        <div className="form-section">
          <label className="section-label">Key Thinkers & Philosophers</label>
          <div className="pill-grid">
            {POPULAR_THINKERS.map((thinker) => {
              const active = keyThinkers.includes(thinker);
              return (
                <button
                  type="button"
                  key={thinker}
                  className={`pill-btn ${active ? "active-thinker" : ""}`}
                  onClick={() => setKeyThinkers(toggleArrayItem(keyThinkers, thinker))}
                >
                  {active ? "★ " : "+ "}
                  {thinker}
                </button>
              );
            })}
          </div>

          <div className="custom-add-bar">
            <input
              type="text"
              className="input-text"
              placeholder="Add custom thinker..."
              value={newThinker}
              onChange={(e) => setNewThinker(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setKeyThinkers(addItem(keyThinkers, newThinker, () => setNewThinker("")));
                }
              }}
            />
            <button
              type="button"
              className="add-btn"
              onClick={() => setKeyThinkers(addItem(keyThinkers, newThinker, () => setNewThinker("")))}
            >
              Add
            </button>
          </div>
        </div>

        {/* Core Philosophical Questions */}
        <div className="form-section">
          <label className="section-label">Core Questions You Explore</label>
          <ul className="question-list">
            {coreQuestions.map((q, idx) => (
              <li key={idx} className="list-item">
                <span>"{q}"</span>
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
              placeholder="e.g. Does free will exist under determinism?"
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

        {/* Favorite Philosophical Texts */}
        <div className="form-section">
          <label className="section-label">Favorite Philosophical Texts</label>
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
              Add Text
            </button>
          </div>
        </div>

        {/* Connection Intents */}
        <div className="form-section">
          <label className="section-label">Connection Intents</label>
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

        {/* Submit Actions */}
        <div className="form-actions" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" className="save-submit-btn" disabled={isSaving}>
            {isSaving ? "Saving Worldview..." : "Save Philosophical Profile"}
          </button>
          <button
            type="button"
            className="secondary-cancel-btn"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </button>
          {saveStatus && <p className="status-feedback">{saveStatus}</p>}
        </div>
      </form>
    </div>
  );
};
