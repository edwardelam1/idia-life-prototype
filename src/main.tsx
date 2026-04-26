/** * [START] Sovereign Infrastructure: Absolute Granular Entry Sequence
 */
console.log("[START] main.tsx: Script Execution Initiated");

const hydrateSovereignGlobals = async () => {
  console.log("[START] hydrateSovereignGlobals execution");
  try {
    console.log("[START] Importing Buffer from 'buffer/'");
    // Using the trailing slash is a known Vite fix for browser-side buffer resolution
    const { Buffer } = await import("buffer/");
    console.log("[END] Importing Buffer from 'buffer/'");

    if (typeof window !== "undefined") {
      console.log("[START] Window Global Assignment");

      console.log("[START] Assigning window.global");
      (window as any).global = window;
      console.log("[END] Assigning window.global");

      console.log("[START] Assigning window.Buffer");
      (window as any).Buffer = Buffer;
      console.log("[END] Assigning window.Buffer");

      console.log("[START] Assigning window.process");
      (window as any).process = (window as any).process || { env: { NODE_ENV: "development" } };
      console.log("[END] Assigning window.process");

      console.log("[SUCCESS] Sovereign Infrastructure: Globals Sealed.");
    }
  } catch (err) {
    console.error("[START] Global Hydration Fatal Error Handler");
    console.error("[FATAL] Infrastructure collapsed during polyfill phase:", err);
    console.error("[END] Global Hydration Fatal Error Handler");
    throw err; // Re-throw to prevent silent death
  }
  console.log("[END] hydrateSovereignGlobals execution");
};

// Execute hydration before React takes the wheel
hydrateSovereignGlobals()
  .then(() => {
    console.log("[START] Post-Hydration React Initialization");

    try {
      console.log("[START] Importing React/DOM dependencies");
      import("react-dom/client").then(({ createRoot }) => {
        console.log("[END] Importing React/DOM dependencies");

        console.log("[START] Importing App Component");
        import("./App.tsx").then(({ default: App }) => {
          console.log("[END] Importing App Component");

          console.log("[START] Importing CSS and Trackers");
          import("./index.css");
          import("./utils/AuthEventTracker");
          console.log("[END] Importing CSS and Trackers");

          const container = document.getElementById("root");
          console.log(`[INFO] Root container check: ${container ? "FOUND" : "MISSING"}`);

          if (container) {
            console.log("[START] createRoot.render execution");
            createRoot(container).render(<App />);
            console.log("[END] createRoot.render execution");
          } else {
            console.error("[CRITICAL] DOM Root Element (#root) is missing.");
          }
        });
      });
    } catch (reactErr) {
      console.error("[START] React Initialization Error Handler");
      console.error("[FATAL] React mount failed:", reactErr);
      console.error("[END] React Initialization Error Handler");
    }

    console.log("[END] Post-Hydration React Initialization");
  })
  .catch((fatal) => {
    console.error("[CRITICAL] Sovereign Entry Sequence Aborted:", fatal);
  });

console.log("[END] main.tsx: Script Execution Initiated");
