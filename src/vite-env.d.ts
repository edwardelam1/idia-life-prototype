/// <reference types="vite/client" />

interface Window {
  webkit?: {
    messageHandlers: {
      initiateNfcHandshake: {
        postMessage: (message: any) => void;
      };
      syncHealthData: {
        postMessage: (message: any) => void;
      };
    };
  };
  // IDIA Native Callbacks
  onNfcHandshakeComplete?: (token: string) => void;
  onNfcHandshakeError?: (error: string) => void;
  onHealthSyncComplete?: (payload: any) => void;
}