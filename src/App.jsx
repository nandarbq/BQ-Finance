import React from "react";
import AuthGate from "./components/AuthGate.jsx";
import AresKuApp from "./components/AresKuApp.jsx";

export default function App() {
  React.useEffect(() => {
    const theme = localStorage.getItem("bq_finance_theme") || "light";
    document.documentElement.dataset.theme = theme;
  }, []);

  return <AuthGate>{(session) => <AresKuApp session={session} />}</AuthGate>;
}
