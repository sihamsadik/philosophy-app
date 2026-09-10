import React from "react";
import type { CompatibilityScore } from "@agora-server/contract";

export interface DualAxisCompatibilityGaugeProps {
  compatibility: CompatibilityScore;
}

export const DualAxisCompatibilityGauge: React.FC<DualAxisCompatibilityGaugeProps> = ({
  compatibility,
}) => {
  const {
    overallScore,
    sharedGroundScore,
    productiveTensionScore,
    overlappingSchools,
    overlappingThinkers,
    overlappingQuestions,
    explanation,
  } = compatibility;

  return (
    <div className="compatibility-gauge-card">
      <div className="gauge-header">
        <div className="overall-score-badge">
          <span className="score-number">{overallScore}%</span>
          <span className="score-label">Intellectual Fit</span>
        </div>
        <div className="gauge-title-block">
          <h4>Dual-Axis Intellectual Compatibility</h4>
          <p className="explanation-text">"{explanation}"</p>
        </div>
      </div>

      <div className="axis-bars-container">
        {/* Shared Ground Score (Similarity) */}
        <div className="axis-row">
          <div className="axis-meta">
            <span className="axis-title">🟢 Shared Ground (Similarity)</span>
            <span className="axis-value">{sharedGroundScore}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill shared-fill"
              style={{ width: `${Math.min(100, sharedGroundScore)}%` }}
            />
          </div>
        </div>

        {/* Productive Tension Score (Meaningful Difference) */}
        <div className="axis-row">
          <div className="axis-meta">
            <span className="axis-title">⚡ Productive Tension (Difference)</span>
            <span className="axis-value">{productiveTensionScore}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill tension-fill"
              style={{ width: `${Math.min(100, productiveTensionScore)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Overlap Badges */}
      <div className="overlap-badges-row">
        {overlappingSchools.length > 0 && (
          <div className="badge-group">
            <span className="group-label">Shared Schools:</span>
            {overlappingSchools.map((s, i) => (
              <span key={i} className="chip school-chip">
                {s}
              </span>
            ))}
          </div>
        )}

        {overlappingThinkers.length > 0 && (
          <div className="badge-group">
            <span className="group-label">Shared Thinkers:</span>
            {overlappingThinkers.map((t, i) => (
              <span key={i} className="chip thinker-chip">
                {t}
              </span>
            ))}
          </div>
        )}

        {overlappingQuestions.length > 0 && (
          <div className="badge-group">
            <span className="group-label">Shared Questions:</span>
            {overlappingQuestions.map((q, i) => (
              <span key={i} className="chip question-chip">
                "{q}"
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
