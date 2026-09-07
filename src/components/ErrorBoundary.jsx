import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error && error.message ? error.message : null };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "var(--bg-page)" }}>
          <div className="w-full text-center" style={{ maxWidth: 300 }}>
            <div className="flex items-center justify-center mx-auto mb-4" style={{ width: 64, height: 64, borderRadius: 20, background: "var(--bg-surface)" }}>
              <span style={{ fontSize: 30 }}>😵</span>
            </div>
            <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 17 }}>
              Oops, ada yang tidak beres
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>
              Terjadi kesalahan yang tidak terduga. Muat ulang aplikasi untuk melanjutkan.
            </p>
            {this.state.errorMessage && (
              <p style={{ marginTop: 12, padding: "8px 10px", borderRadius: 10, background: "var(--bg-muted)", color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 10.5, lineHeight: 1.5, wordBreak: "break-all", textAlign: "left" }}>
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="w-full mt-5 py-3 rounded-2xl"
              style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 13, fontWeight: 700 }}
            >
              Muat ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}