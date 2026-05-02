/// <reference types="vite/client" />
interface Window {
  webkit?: {
    messageHandlers: {
      initiateNfcHandshake: {
        postMessage: (message: any) => void;
      };
      // Add other handlers here as you build them (e.g., syncHealthData)
      syncHealthData: {
        postMessage: (message: any) => void;
      };
    };
  };
  // Also define your custom callbacks from the Swift shell
  onNfcHandshakeComplete?: (token: string) => void;
  onNfcHandshakeError?: (error: string) => void;
