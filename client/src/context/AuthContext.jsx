import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { getOrCreateUser } from "../utils/user.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Active user object: Google user if authenticated, else anonymous user
  const anonUser = getOrCreateUser();

  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name:
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "Campus User",
        avatar:
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture ||
          null,
        initials: (
          session.user.user_metadata?.full_name || session.user.email || "CU"
        )
          .substring(0, 2)
          .toUpperCase(),
        isAuthenticated: true,
      }
    : {
        id: anonUser.userId,
        email: "",
        name: anonUser.name,
        avatar: null,
        initials: anonUser.initials,
        isAuthenticated: false,
      };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
