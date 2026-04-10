function parseIsoDate(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getMenuAvailabilityState(item, now = Date.now()) {
  const stockCount =
    typeof item?.stockCount === "number" && Number.isFinite(item.stockCount)
      ? item.stockCount
      : null;
  const inStock = typeof item?.inStock === "boolean" ? item.inStock : true;
  const autoHideWhenOutOfStock = Boolean(item?.autoHideWhenOutOfStock);
  const availableAgainAt = parseIsoDate(item?.availableAgainAt);

  if (availableAgainAt && availableAgainAt > now) {
    return {
      visible: false,
      reason: "scheduled",
      label: "Scheduled return",
      message: `Returns ${new Date(availableAgainAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })}`,
    };
  }

  if (!inStock) {
    return {
      visible: false,
      reason: "paused",
      label: "Temporarily paused",
      message: "This item is hidden by the shop right now.",
    };
  }

  if (autoHideWhenOutOfStock && stockCount !== null && stockCount <= 0) {
    return {
      visible: false,
      reason: "sold-out",
      label: "Hidden until restock",
      message: "The store auto-hides this item when it sells out.",
    };
  }

  if (stockCount !== null && stockCount <= 3) {
    return {
      visible: true,
      reason: "low-stock",
      label: "Low stock",
      message: `${stockCount} left right now`,
    };
  }

  return {
    visible: true,
    reason: "available",
    label: "Available",
    message: "Ready for local delivery",
  };
}
