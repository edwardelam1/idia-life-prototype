import React, { useEffect, useState } from "react";

interface FlashingSplashScreenProps {
  onVerificationComplete: () => void;
}

export default function FlashingSplashScreen({ onVerificationComplete }: FlashingSplashScreenProps) {
  const [flashColor, setFlashColor] = useState("#0a0f1a");
  const [status, setStatus] = useState("INITIALIZING CAMERA SENSOR...");

  useEffect(() => {
    // Simulate CMD_INIT_FLASHBULB sequence
    const sequence = async () => {
      await new Promise((r) => setTimeout(r, 800));
      setStatus("MEASURING PUPIL LATENCY...");

      // White -> Red -> Blue sequence
      setFlashColor("#ffffff");
      await new Promise((r) => setTimeout(r, 150));
      setFlashColor("#ff0000");
      await new Promise((r) => setTimeout(r, 150));
      setFlashColor("#4f8aff");
      await new Promise((r) => setTimeout(r, 150));

      setFlashColor("#0a0f1a");
      setStatus("BIOMETRIC VERIFIED");

      await new Promise((r) => setTimeout(r, 1000));
      onVerificationComplete();
    };

    sequence();
  }, [onVerificationComplete]);

  return (
    <div
      className="flex flex-col items-center justify-center h-screen transition-colors duration-75"
      style={{ backgroundColor: flashColor }}
    >
      {/* Native Camera Viewfinder Placeholder */}
      <div className="w-64 h-64 border-2 border-white/20 rounded-full mb-8 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-white/5"></div>
      </div>

      <p
        className={`font-mono tracking-widest text-sm ${status === "BIOMETRIC VERIFIED" ? "text-green-400" : "text-[#4f8aff]"}`}
      >
        {status}
      </p>
    </div>
  );
}
