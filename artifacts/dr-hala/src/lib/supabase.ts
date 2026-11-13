import { createClient } from "@supabase/supabase-js";

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export const supabaseConfigurationIssue =
  !projectUrl && !publicKey
    ? "Supabase cloud sync is not configured yet."
    : !projectUrl || !publicKey
      ? "Cloud sync needs both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
      : !isHttpUrl(projectUrl)
        ? "VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL."
        : null;

export const supabase =
  supabaseConfigurationIssue === null
    ? createClient(projectUrl, publicKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;
