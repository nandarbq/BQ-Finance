import React from "react";
import AuthGate from "./components/AuthGate.jsx";
import BqFinanceApp from "./components/BqFinanceApp.jsx";
import logoUrl from "./assets/bq-logo-full.png";

export default function App() {
  React.useEffect(() => {
    const theme = localStorage.getItem("bq_finance_theme") || "light";
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#121212" : "#ffffff");
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.type = "image/png";
    favicon.href = logoUrl;
  }, []);

  return <AuthGate>{(session) => <BqFinanceApp session={session} />}</AuthGate>;
}
