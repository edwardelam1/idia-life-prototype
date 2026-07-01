// Save a file to the device. On native (iOS/Android via Capacitor) writes to
// the Documents directory and opens the OS share sheet so the user can pick
// Files / Downloads / iCloud / etc. On web, falls back to a blob <a download>.

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export interface SaveFileOptions {
  filename: string;
  data: string | Blob;
  mimeType: string;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });

const stringToBase64 = (s: string): string => {
  // Handle Unicode safely
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const webFallback = ({ filename, data, mimeType }: SaveFileOptions) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export async function saveFileToDevice(opts: SaveFileOptions): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    webFallback(opts);
    return;
  }

  const { filename, data } = opts;
  const base64 = data instanceof Blob ? await blobToBase64(data) : stringToBase64(data);

  const written = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });

  try {
    await Share.share({
      title: filename,
      url: written.uri,
      dialogTitle: "Save file",
    });
  } catch {
    // User dismissed the share sheet — file is still saved in Documents.
  }
}

// Explicit unused-import guard for tree-shakers / linters
void Encoding;
