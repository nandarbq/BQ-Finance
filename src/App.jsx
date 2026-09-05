import React from "react";
import AuthGate from "./components/AuthGate.jsx";
import AresKuApp from "./components/AresKuApp.jsx";

export default function App() {
  return <AuthGate>{(session) => <AresKuApp session={session} />}</AuthGate>;
}
