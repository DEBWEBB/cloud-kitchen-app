export async function requestNotificationPermissionSafely() {
  if (
    typeof window === "undefined" ||
    typeof Notification === "undefined" ||
    typeof Notification.requestPermission !== "function"
  ) {
    return "unsupported";
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return "unsupported";
  }
}

export async function showNotificationSafely(title, options = {}) {
  if (
    typeof window === "undefined" ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  try {
    if (
      "serviceWorker" in navigator &&
      navigator.serviceWorker?.ready
    ) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    if (typeof Notification === "function") {
      new Notification(title, options);
      return true;
    }
  } catch (error) {
    console.warn("Notification display failed:", error);
  }

  return false;
}
