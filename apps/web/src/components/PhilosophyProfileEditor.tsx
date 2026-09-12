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
  onSaveSuccess?: (updatedProfile: PhilosophyProfile) => void;
}

export const PhilosophyProfileEditor: React.FC<PhilosophyProfileEditorProps> = ({
  userId,
  initialProfile,
  onSaveSuccess,
}) => {
  const [worldviewSummary, setWorldviewSummary] = useState(initialProfile?.worldviewSummary || "");
  const [primarySchools, setPrimarySchools] = useState<string[]>(initialProfile?.primarySchools || []);
  const [keyThinkers, setKeyThinkers] = useState<string[]>(initialProfile?.keyThinkers || []);
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

    const payload: PhilosophyProfile = {
      worldviewSummary,
      primarySchools,
      keyThinkers,
      coreQuestions,
      favoriteTexts,
      connectionIntents,
    };

    try {
      await agoraClient.updatePhilosophyProfile(userId, payload);
      setSaveStatus("Worldview profile saved successfully!");
      if (onSaveSuccess) onSaveSuccess(payload);
    } catch (err: any) {
      setSaveStatus(`Failed to save profile: ${err.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="philosophy-editor-card">
      <div className="editor-header">
        <h2>🧠 Philosophical Identity & Worldview Profile</h2>
        <p className="editor-subtitle">
          Express your foundational schools of thought, favorite thinkers, and core inquiries.
        </p>
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
        <div className="form-actions">
          <button type="submit" className="save-submit-btn" disabled={isSaving}>
            {isSaving ? "Saving Worldview..." : "Save Philosophical Profile"}
          </button>
          {saveStatus && <p className="status-feedback">{saveStatus}</p>}
        </div>
      </form>
    </div>
  );
};
