import React, { useState } from "react";

interface AuthSelectionProps {
  onNext: () => void;
}

export default function AuthSelection({ onNext }: AuthSelectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAuth = async (provider: "APPLE" | "EMAIL") => {
    setIsProcessing(true);

    // AUT-M.2.4: Crazy Gatekeeper Hook Payload
    const authEventPayload = {
      provider,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      // In production Capacitor app, fetch native Device ID here
      deviceId: "native_device_identifier_stub",
    };

    try {
      // Stub: Transmit payload to AWS API Gateway for Crazy Shield evaluation
      console.log("Transmitting to Security Agent:", authEventPayload);

      // Simulate network latency / AWS Cognito Handshake
      await new Promise((resolve) => setTimeout(resolve, 1200));

      onNext();
    } catch (error) {
      console.error("Auth interception failed", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0a0f1a] text-white px-6">
      <h1 className="text-4xl font-bold mb-8 text-[#d4af37] tracking-wider">IDIA Life</h1>

      {isProcessing ? (
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-12 h-12 border-4 border-[#4f8aff] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#4f8aff] font-mono tracking-widest text-sm">EVALUATING ENVIRONMENT...</p>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => handleAuth("APPLE")}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl flex items-center justify-center space-x-2 transition hover:bg-gray-200"
          >
            <span>Continue with Apple</span>
          </button>

          <button
            onClick={() => handleAuth("EMAIL")}
            className="w-full bg-transparent border border-[#4f8aff] text-[#4f8aff] font-semibold py-4 rounded-xl transition hover:bg-[#4f8aff] hover:text-white"
          >
            Continue with Email
          </button>
        </div>
      )}
    </div>
  );
}
