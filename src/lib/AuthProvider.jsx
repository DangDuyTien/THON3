import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUserRole, getSession, signIn, signOut, subscribeToAuth } from "./auth-api.js";
import { isSupabaseConfigured } from "./supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    getSession()
      .then(async (nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setRole(nextSession?.user ? await getCurrentUserRole(nextSession.user.id) : null);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => active && setLoading(false));

    return subscribeToAuth(async (nextSession) => {
      setSession(nextSession);
      setRole(nextSession?.user ? await getCurrentUserRole(nextSession.user.id) : null);
    });
  }, []);

  const value = useMemo(() => ({
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user || null,
    role,
    isAdmin: role === "admin" || role === "editor",
    login: signIn,
    logout: signOut,
  }), [loading, role, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
