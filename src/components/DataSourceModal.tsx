import React, { useState } from "react";

interface DataSourceModalProps {
  source: any;
  onClose: () => void;
  onConsent: () => void;
}

export default function DataSourceModal({ source, onClose, onConsent }: DataSourceModalProps) {
  // Granular toggles specific to the telemetry source
  const [permissions, setPermissions] = useState({
    steps: true,
    heartRate: true,
    sleep: false,
    energyBurned: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConsent = async () => {
    setIsProcessing(true);
    // Simulate native bridge handshake delay
    await new Promise((r) => setTimeout(r, 1200));
    setIsProcessing(false);
    onConsent();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content (Bottom Sheet) */}
      <div className="relative bg-[#111827] border-t border-white/10 rounded-t-3xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-300">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/5 flex items-center space-x-4">
          <div
            className={`w-12 h-12 rounded-xl ${source.color} ${source.textColor} flex items-center justify-center text-2xl`}
          >
            {source.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{source.name}</h2>
            <p className="text-xs text-gray-400">Select data to sync</p>
          </div>
        </div>

        {/* Permissions List (Scrollable if needed inside modal) */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {Object.entries(permissions).map(([key, isEnabled]) => (
            <div
              key={key}
              className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5"
            >
              <span className="capitalize text-sm font-medium text-gray-200">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <button
                onClick={() => togglePermission(key as keyof typeof permissions)}
                className={`w-12 h-6 rounded-full transition-colors relative ${isEnabled ? "bg-[#4f8aff]" : "bg-gray-600"}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isEnabled ? "translate-x-7" : "translate-x-1"}`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Action Area */}
        <div className="p-6 pt-2 pb-10 bg-[#111827]">
          <button
            onClick={handleConsent}
            disabled={isProcessing}
            className="w-full bg-[#4f8aff] text-white font-semibold py-4 rounded-xl transition active:scale-95 flex justify-center items-center"
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "You have my consent"
            )}
          </button>
          <button onClick={onClose} className="w-full mt-4 text-sm text-gray-400 py-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
