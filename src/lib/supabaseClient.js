import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://oedmcntahzowpxebgjlv.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lZG1jbnRhaHpvd3B4ZWJnamx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTE0MzcsImV4cCI6MjA4OTQ4NzQzN30.sryGPJ5AxcN02IorUvHZcGiyYSTRRYdGBsK-xA4ovh8";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

function getProjectRefFromUrl(url = "") {
  try {
    return new URL(url).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

function getProjectRefFromAnonKey(key = "") {
  try {
    const payload = JSON.parse(atob(key.split(".")[1]));
    return payload.ref || "";
  } catch {
    return "";
  }
}

const urlProjectRef = getProjectRefFromUrl(supabaseUrl);
const keyProjectRef = getProjectRefFromAnonKey(supabaseKey);

if (urlProjectRef && keyProjectRef && urlProjectRef !== keyProjectRef) {
  console.warn(
    `Supabase config mismatch: URL points to "${urlProjectRef}" but anon key belongs to "${keyProjectRef}". Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for the same project.`
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
