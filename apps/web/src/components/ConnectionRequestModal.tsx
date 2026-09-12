import React, { useState } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient } from "../lib/api-client.js";

export interface ConnectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User | null;
  onSuccess?: () => void;
}

export const ConnectionRequestModal: React.FC<ConnectionRequestModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}) => {
  const [introNote, setIntroNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSentSuccess, setIsSentSuccess] = useState(false);

  if (!isOpen || !targetUser) return null;

  const defaultIntro = `Greetings ${targetUser.name || targetUser.username}, I read your philosophical perspectives on Agora and would love to connect to exchange ideas and engage in productive intellectual dialogue.`;

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      await agoraClient.sendConnectionRequest(
        targetUser.id,
        introNote.trim() || defaultIntro,
        targetUser
      );
      setIsSentSuccess(true);
      setTimeout(() => {
        setIsSentSuccess(false);
        setIntroNote("");
        if (onSuccess) onSuccess();
        onClose();
      }, 1400);
    } catch (err) {
      console.error("Failed to send connection request:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="settings-modal-pane connection-modal-pane" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <div className="header-title-block">
            <h3>🤝 Send Intellectual Connection Invite</h3>
            <p className="settings-subtitle">
              Initiate a formal connection with personalized dialogue intentions.
            </p>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {isSentSuccess ? (
          <div className="request-sent-success-state">
            <span className="success-icon">✨</span>
            <h4>Connection Invite Sent!</h4>
            <p>Your introduction note has been sent to @{targetUser.username || "philosopher"}.</p>
          </div>
        ) : (
          <form onSubmit={handleSendRequest} className="settings-form-body">
            {/* Recipient Profile Summary Card */}
            <div className="recipient-summary-box">
              <div className="author-identity">
                {targetUser.avatar ? (
                  <img src={targetUser.avatar} alt="Avatar" className="author-avatar-img" />
                ) : (
                  <div className="author-avatar-circle">
                    {(targetUser.name || targetUser.username || "P").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="recipient-name">{targetUser.name || targetUser.username}</h4>
                  <span className="author-handle-text">@{targetUser.username || "philosopher"}</span>
                </div>
              </div>

              {/* Compatibility Summary Badges */}
              <div className="compatibility-badges-row">
                <span className="compatibility-chip high-overlap">
                  🟢 88% Shared Interests
                </span>
                <span className="compatibility-chip productive-tension">
                  ⚡ Productive Dialectical Tension
                </span>
              </div>

              {targetUser.bio && <p className="recipient-bio">{targetUser.bio}</p>}
            </div>

            {/* Intro Note Input */}
            <div className="form-group">
              <label className="section-label">Personalized Introduction Note</label>
              <textarea
                className="input-textarea"
                rows={4}
                placeholder={defaultIntro}
                value={introNote}
                onChange={(e) => setIntroNote(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="settings-actions">
              <button type="button" className="action-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="save-submit-btn" disabled={isSending}>
                {isSending ? "Sending Invite..." : "🤝 Send Connection Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
