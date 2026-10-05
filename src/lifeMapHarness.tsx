import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import LifeChallengeMap from "./components/life/LifeChallengeMap";

// Temporary verification harness — deleted after the check. Not part of the app.
const launched: number[] = (window as any).__launched = [];

const root = createRoot(document.getElementById("root")!);
root.render(
  <div style={{ height: "85vh" }}>
    <LifeChallengeMap
      score={850}
      progress={{ assessment: false, connection: false, goodDeed: false, dataSource: false, proposalVote: false }}
      celebrated={false}
      loading={false}
      onChallenge={(c) => launched.push(c)}
      onCelebrate={async () => undefined}
    />
  </div>
);
