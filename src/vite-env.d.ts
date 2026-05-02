/// <reference types="vite/client" />

interface Window {
  webkit?: {
    messageHandlers: {
      initiateNfcHandshake?: {
        postMessage: (message: any) => void;
      };
      syncHealthData?: {
        postMessage: (message: any) => void;
      };
      [key: string]: { postMessage: (message: any) => void } | undefined;
    };
  };
  // IDIA Native Callbacks from the Swift Shell
  onNfcHandshakeComplete?: (token: string) => void;
  onNfcHandshakeError?: (error: string) => void;
  onHealthSyncComplete?: (payload: any) => void;
}
