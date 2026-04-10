import { auth } from "../firebase/firebaseConfig";
import { getApiUnreachableMessage, getApiUrl } from "./apiBaseUrl";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read security image."));
    reader.readAsDataURL(file);
  });
}

export async function uploadPartnerSecurityAsset({ userId, kind, sourceFile }) {
  if (!userId || !kind || !sourceFile) {
    throw new Error("Missing user, asset type, or image file.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    throw new Error("Please log in again before uploading security files.");
  }

  const file =
    sourceFile instanceof File
      ? sourceFile
      : new File([sourceFile], `${kind}.jpg`, { type: "image/jpeg" });

  const idToken = await currentUser.getIdToken();
  const imageData = await fileToDataUrl(file);

  let response;
  try {
    response = await fetch(getApiUrl("/api/upload-partner-security"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        userId,
        kind,
        imageData,
      }),
    });
  } catch {
    throw new Error(getApiUnreachableMessage("Delivery backend"));
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.assetId) {
    if (response.status === 404) {
      throw new Error(
        "Secure partner upload is not available on the running backend yet. Restart the backend server and try again."
      );
    }
    throw new Error(payload?.error || "Security upload failed.");
  }

  return payload;
}
