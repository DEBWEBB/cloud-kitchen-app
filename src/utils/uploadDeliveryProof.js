import { auth } from "../firebase/firebaseConfig";
import { getApiUnreachableMessage, getApiUrl } from "./apiBaseUrl";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read proof image."));
    reader.readAsDataURL(file);
  });
}

export const uploadDeliveryProof = async ({ orderId, stage, sourceFile }) => {
  if (!orderId || !stage || !sourceFile) {
    throw new Error("Missing order, stage, or image file.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Please log in again before uploading proof.");
  }

  const file =
    sourceFile instanceof File
      ? sourceFile
      : new File([sourceFile], `${stage}-proof.jpg`, { type: "image/jpeg" });

  const idToken = await currentUser.getIdToken();
  const imageData = await fileToDataUrl(file);

  let response;
  try {
    response = await fetch(getApiUrl("/api/upload-delivery-proof"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId,
        stage,
        imageData,
        userId: currentUser.uid,
      }),
    });
  } catch {
    throw new Error(getApiUnreachableMessage("Upload backend"));
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.publicUrl) {
    throw new Error(payload?.error || "Proof upload failed. Please try again.");
  }

  return payload.publicUrl;
};
