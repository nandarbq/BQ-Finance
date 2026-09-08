import React from "react";
import AuthGate from "./components/AuthGate";
import BqFinanceApp from "./components/BqFinanceApp";
import ErrorBoundary from "./components/ErrorBoundary";
import logoUrl from "./assets/logo bq-finance.png";

export default function App() {
  React.useEffect(() => {
    const theme = localStorage.getItem("bq_finance_theme") || "light";
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#121212" : "#00ab6b");
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.type = "image/png";
    favicon.href = logoUrl;
  }, []);

  return (
    <ErrorBoundary>
      <AuthGate>{(session) => <BqFinanceApp session={session} />}</AuthGate>
    </ErrorBoundary>
  );
}
