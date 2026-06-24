import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
          <div
            className="icon-badge"
            style={{ margin: "0 auto 1rem", background: "var(--peach-lo)", border: "2.5px solid var(--orange)" }}
          >
            <AlertTriangle size={22} strokeWidth={2} style={{ color: "var(--orange)" }} />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", marginBottom: "0.75rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "var(--ink-soft)", fontWeight: 600, marginBottom: "1.5rem", maxWidth: 400, margin: "0 auto 1.5rem" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
