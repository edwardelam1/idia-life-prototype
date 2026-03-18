import React, { useState } from "react";
import DataSourceModal from "./DataSourceModal";

interface DataDashboardProps {
  onComplete?: (vaultHash: string) => void;
  onBack?: () => void;
}

const INTEGRATIONS = [
  { id: "apple_health", name: "Apple Health", color: "bg-white", textColor: "text-black", icon: "❤️" },
  { id: "google_fit", name: "Google Fit", color: "bg-blue-500", textColor: "text-white", icon: "🏃" },
  { id: "strava", name: "Strava", color: "bg-orange-500", textColor: "text-white", icon: "🚴" },
  { id: "oura", name: "Oura Ring", color: "bg-zinc-800", textColor: "text-white", icon: "💍" },
];

export default function DataDashboard({ onComplete, onBack }: DataDashboardProps) {
  const [selectedSource, setSelectedSource] = useState<any | null>(null);
  const [connectedSources, setConnectedSources] = useState<Record<string, boolean>>({});

  const handleConsentGiven = (sourceId: string) => {
    setConnectedSources((prev) => ({ ...prev, [sourceId]: true }));
    setSelectedSource(null);
  };

  const handleContinue = () => {
    // Simulate the backend hash generation invisibly to the user
    const mockHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    onComplete(mockHash);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0f1a] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="pt-12 pb-6 px-6 flex-shrink-0">
        <button onClick={onBack} className="text-gray-400 mb-4 hover:text-white transition">
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-[#d4af37]">Connect Telemetry</h1>
        <p className="text-sm text-gray-400 mt-2">
          Select the data sources you wish to sync. You control what is shared.
        </p>
      </div>

      {/* Main Content: Horizontal Carousel */}
      <div className="flex-grow flex items-center">
        <div className="w-full flex overflow-x-auto snap-x snap-mandatory px-6 pb-8 space-x-6 hide-scrollbar">
          {INTEGRATIONS.map((source) => {
            const isConnected = connectedSources[source.id];

            return (
              <button
                key={source.id}
                onClick={() => setSelectedSource(source)}
                className={`snap-center flex-shrink-0 w-48 h-64 rounded-3xl border ${isConnected ? "border-green-500 bg-white/10" : "border-white/10 bg-white/5"} backdrop-blur-md flex flex-col items-center justify-center relative transition-transform active:scale-95`}
              >
                {/* Connected Badge */}
                {isConnected && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                    ✓
                  </div>
                )}

                <div
                  className={`w-20 h-20 rounded-2xl ${source.color} ${source.textColor} flex items-center justify-center text-4xl mb-4 shadow-lg`}
                >
                  {source.icon}
                </div>
                <h3 className="font-semibold text-lg">{source.name}</h3>
                <span className={`text-xs mt-2 ${isConnected ? "text-green-400" : "text-gray-500"}`}>
                  {isConnected ? "Syncing Active" : "Not Connected"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="p-6 flex-shrink-0 pb-12">
        <button
          onClick={handleContinue}
          disabled={Object.keys(connectedSources).length === 0}
          className={`w-full font-semibold py-4 rounded-xl transition ${
            Object.keys(connectedSources).length > 0
              ? "bg-[#4f8aff] text-white shadow-[0_0_15px_rgba(79,138,255,0.3)]"
              : "bg-white/5 text-gray-500 cursor-not-allowed"
          }`}
        >
          {Object.keys(connectedSources).length > 0 ? "Enter IDIA Life" : "Connect a Source to Continue"}
        </button>
      </div>

      {/* Specific Source Modal */}
      {selectedSource && (
        <DataSourceModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
          onConsent={() => handleConsentGiven(selectedSource.id)}
        />
      )}
    </div>
  );
}
