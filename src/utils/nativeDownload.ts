// Save a file to the device. On native (iOS/Android via Capacitor) writes to
// the Documents directory and opens the OS Share sheet so the user can move
// the file into Files / Downloads / iCloud / email / etc. On web, falls back
// to a hidden anchor <a download>. Instrumented with granular flow logs so
// any silent OS handoff stall is visible in the console.

import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

interface DownloadOptions {
  filename: string;
  data: string | Blob;
  mimeType: string;
}

export const saveFileToDevice = async ({
  filename,
  data,
  mimeType,
}: DownloadOptions): Promise<void> => {
  console.log(`📥 [DOWNLOAD_FLOW_LOG] START: Initiating saveFileToDevice for [${filename}]`);

  try {
    if (Capacitor.isNativePlatform()) {
      console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Native environment detected. Preparing file for OS filesystem.`);
      let base64Data: string;

      if (typeof data === "string") {
        console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Data identified as string. Converting to Base64...`);
        base64Data = btoa(unescape(encodeURIComponent(data)));
        console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: String to Base64 conversion complete.`);
      } else {
        console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Data identified as Blob. Initializing FileReader...`);
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: FileReader onload triggered. Extracting Base64 payload.`);
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? "");
          };
          reader.onerror = (error) => {
            console.error(`🚨 [DOWNLOAD_FLOW_LOG] ERROR: FileReader failed to parse Blob:`, error);
            reject(error);
          };
          reader.readAsDataURL(data);
        });
        console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Blob to Base64 conversion complete.`);
      }

      console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Writing file to device Documents directory...`);
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      });
      console.log(`📥 [DOWNLOAD_FLOW_LOG] SUCCESS: File successfully written to URI: ${writeResult.uri}`);

      console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Triggering native OS Share sheet...`);
      await Share.share({
        title: filename,
        url: writeResult.uri,
      });
      console.log(`📥 [DOWNLOAD_FLOW_LOG] SUCCESS: Native OS Share sheet resolved (completed or dismissed).`);
    } else {
      console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Web environment detected. Executing standard anchor fallback.`);

      const url =
        typeof data === "string"
          ? `data:${mimeType};charset=utf-8,${encodeURIComponent(data)}`
          : URL.createObjectURL(data);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);

      console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Firing hidden anchor click event.`);
      link.click();

      document.body.removeChild(link);
      console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Anchor element cleaned from DOM.`);

      if (typeof data !== "string") {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          console.log(`📥 [DOWNLOAD_FLOW_LOG] PROCESS: Revoked ObjectURL to prevent memory leaks.`);
        }, 150);
      }
      console.log(`📥 [DOWNLOAD_FLOW_LOG] SUCCESS: Web fallback download completed.`);
    }
  } catch (error) {
    console.error(`🚨 [DOWNLOAD_FLOW_LOG] ERROR: Critical failure during saveFileToDevice execution:`, error);
    throw error;
  } finally {
    console.log(`📥 [DOWNLOAD_FLOW_LOG] END: saveFileToDevice execution concluded.`);
  }
};
