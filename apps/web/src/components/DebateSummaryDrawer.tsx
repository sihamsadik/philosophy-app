import React, { useState, useEffect } from "react";
import type { DiscussionSummary } from "@agora-server/contract";
import { agoraClient } from "../lib/api-client.js";

export interface DebateSummaryDrawerProps {
  entityId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DebateSummaryDrawer: React.FC<DebateSummaryDrawerProps> = ({
  entityId,
  isOpen,
  onClose,
}) => {
  const [summary, setSummary] = useState<DiscussionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      setIsLoading(true);
      setError(null);
      agoraClient
        .getDiscussionSummary(entityId)
        .then((data) => setSummary(data))
        .catch((err) => setError(err.message || "Failed to generate debate analysis"))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, entityId]);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content-pane" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>🧠 AI Discussion Summarization & Debate Analysis</h3>
            <p className="drawer-subtitle">
              Structured summary of positions, arguments, agreements, and open inquiry paths.
            </p>
          </div>
          <button className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="drawer-loading">
            <div className="spinner" />
            <p>Analyzing comment trees and extracting philosophical stances...</p>
          </div>
        ) : error ? (
          <div className="drawer-error">
            <p>{error}</p>
          </div>
        ) : !summary ? (
          <div className="drawer-empty">No debate summary available.</div>
        ) : (
          <div className="drawer-body">
            <div className="meta-stats-bar">
              <span>💬 {summary.commentCount} Total Comments Analyzed</span>
              <span>🕒 Generated: {new Date(summary.generatedAt).toLocaleTimeString()}</span>
            </div>

            {/* Main Positions / Theses */}
            <div className="summary-section">
              <h4 className="section-title">📌 Main Philosophical Positions & Theses</h4>
              <div className="position-cards-grid">
                {summary.mainPositions.map((pos, idx) => (
                  <div key={idx} className="position-card">
                    <div className="pos-header">
                      <h5>{pos.title}</h5>
                      {pos.proponent && <span className="proponent-badge">Proponent: {pos.proponent}</span>}
                    </div>
                    <p className="pos-summary">{pos.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Arguments & Rebuttals */}
            {summary.keyArguments.length > 0 && (
              <div className="summary-section">
                <h4 className="section-title">⚔️ Key Arguments & Rebuttals</h4>
                <div className="arguments-list">
                  {summary.keyArguments.map((arg, idx) => (
                    <div key={idx} className="argument-box">
                      <div className="arg-statement">
                        <strong>Argument:</strong> {arg.argument}
                      </div>
                      {arg.rebuttal && (
                        <div className="rebuttal-statement">
                          <strong>Rebuttal:</strong> {arg.rebuttal}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Points of Agreement & Disagreement */}
            <div className="dual-column-section">
              <div className="summary-column agreement-col">
                <h4 className="section-title">🤝 Points of Agreement</h4>
                <ul>
                  {summary.pointsOfAgreement.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="summary-column disagreement-col">
                <h4 className="section-title">⚡ Points of Disagreement</h4>
                <ul>
                  {summary.pointsOfDisagreement.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Unresolved Questions */}
            {summary.unresolvedQuestions.length > 0 && (
              <div className="summary-section">
                <h4 className="section-title">❓ Unresolved Philosophical Questions</h4>
                <div className="questions-box-list">
                  {summary.unresolvedQuestions.map((q, idx) => (
                    <div key={idx} className="question-box-item">
                      <span>"{q}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
