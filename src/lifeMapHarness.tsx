import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LifeChallengeMap from "./components/life/LifeChallengeMap";
import "./index.css";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <div className="flex h-screen flex-col bg-card">
        <LifeChallengeMap
          score={null}
          progress={{
            assessment: false,
            connection: false,
            goodDeed: false,
            dataSource: false,
            proposalVote: false,
          }}
          celebrated={false}
          loading={false}
          onChallenge={() => undefined}
          onCelebrate={async () => undefined}
        />
      </div>
    </StrictMode>,
  );
}
