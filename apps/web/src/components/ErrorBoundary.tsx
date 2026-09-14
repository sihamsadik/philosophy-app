import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" style={{ padding: "32px", textAlign: "center", background: "rgba(18, 26, 43, 0.85)", borderRadius: "16px", margin: "20px 0", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <h3 style={{ fontSize: "1.3rem", color: "#fca5a5", marginBottom: "8px" }}>
            🏛️ {this.props.fallbackTitle || "Application Feed Recovered"}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
            {this.state.error?.message || "An unexpected error occurred while rendering content."}
          </p>
          <button
            type="button"
            className="connect-btn"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            🔄 Refresh Application Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
