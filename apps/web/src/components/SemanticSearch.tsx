import React, { useState } from "react";
import { agoraClient } from "../lib/api-client.js";

export const SemanticSearch: React.FC = () => {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "users" | "entities" | "spaces">("all");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await agoraClient.searchSemantic({
        q: query.trim(),
        type: searchType,
        limit: 15,
      });
      setResults(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to execute semantic search");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="semantic-search-container">
      <div className="search-header">
        <h2>🔍 Semantic Concept Search</h2>
        <p className="search-subtitle">
          Search by philosophical concepts, inquiries, and ideas rather than exact keyword matches.
        </p>
      </div>

      <form onSubmit={handleSearch} className="search-bar-form">
        <div className="search-input-group">
          <input
            type="text"
            className="main-search-input"
            placeholder="e.g., 'People discussing free will and determinism' or 'Critiques of existentialism'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="execute-search-btn" disabled={isSearching}>
            {isSearching ? "Searching Concepts..." : "Search Concepts"}
          </button>
        </div>

        <div className="type-toggle-group">
          {(["all", "users", "entities", "spaces"] as const).map((t) => (
            <button
              type="button"
              key={t}
              className={`type-tab-btn ${searchType === t ? "active" : ""}`}
              onClick={() => setSearchType(t)}
            >
              {t === "all"
                ? "🌐 All Content"
                : t === "users"
                ? "👤 Thinkers"
                : t === "entities"
                ? "📜 Arguments & Posts"
                : "🏛️ Philosophy Spaces"}
            </button>
          ))}
        </div>
      </form>

      {/* Results Rendering */}
      {isSearching ? (
        <div className="search-loading">
          <div className="spinner" />
          <p>Computing vector similarity scores...</p>
        </div>
      ) : error ? (
        <div className="search-error">{error}</div>
      ) : hasSearched && results.length === 0 ? (
        <div className="search-empty">
          <p>No semantic matches found for "{query}". Try broadening your prompt.</p>
        </div>
      ) : (
        <div className="results-list">
          {results.map((item, index) => {
            const { type, similarity, record } = item;
            const percentage = Math.round((similarity ?? 0.8) * 100);

            return (
              <div key={index} className="search-result-card">
                <div className="result-card-header">
                  <span className={`result-type-tag ${type}`}>
                    {type === "profile" ? "👤 Thinker Profile" : type === "space" ? "🏛️ Philosophy Space" : "📜 Philosophical Argument"}
                  </span>
                  <span className="similarity-badge">
                    {percentage}% Similarity
                  </span>
                </div>

                <div className="result-card-body">
                  {type === "profile" && (
                    <div>
                      <h4 className="result-title">{record.name || record.username}</h4>
                      <p className="result-snippet">{record.philosophyProfile?.worldviewSummary || record.bio || "No bio provided."}</p>
                      {record.philosophyProfile?.primarySchools && (
                        <div className="chip-row">
                          {record.philosophyProfile.primarySchools.map((s: string, i: number) => (
                            <span key={i} className="chip school-chip">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {type === "space" && (
                    <div>
                      <h4 className="result-title">🏛️ {record.name}</h4>
                      <p className="result-snippet">{record.description || "Philosophy community space."}</p>
                    </div>
                  )}

                  {type === "entity" && (
                    <div>
                      <h4 className="result-title">{record.title || "Untitled Discussion"}</h4>
                      <p className="result-snippet">{record.content?.slice(0, 200)}...</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
