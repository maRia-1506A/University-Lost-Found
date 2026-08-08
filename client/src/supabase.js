import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. " +
      "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to client/.env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) console.error("Google sign in error:", error.message);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Sign out error:", error.message);
}
