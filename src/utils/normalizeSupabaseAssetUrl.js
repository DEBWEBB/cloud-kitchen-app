const OLD_SUPABASE_HOST = "ifeiftlrgtitvrsilztg.supabase.co";
const NEW_SUPABASE_HOST = "oedmcntahzowpxebgjlv.supabase.co";

export default function normalizeSupabaseAssetUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    return url || "";
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === OLD_SUPABASE_HOST) {
      parsed.hostname = NEW_SUPABASE_HOST;
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}
