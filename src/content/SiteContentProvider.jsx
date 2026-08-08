import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cloneDefaultSiteContent, loadSiteContent, normalizeSiteContent } from "./content-store.js";
import { getPublishedContent, publishContent } from "../lib/content-api.js";
import { getSession } from "../lib/auth-api.js";
import { isSupabaseConfigured } from "../lib/supabase.js";

const SiteContentContext = createContext(null);

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(() => (isSupabaseConfigured ? cloneDefaultSiteContent() : loadSiteContent()));
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    getPublishedContent()
      .then((nextContent) => active && setContent(nextContent))
      .catch((loadError) => active && setError(loadError?.message || "Không thể tải nội dung từ máy chủ."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const saveContent = useCallback(async (nextContent) => {
    const normalizedContent = normalizeSiteContent(nextContent);
    if (!isSupabaseConfigured) {
      setContent(normalizedContent);
      return normalizedContent;
    }
    const session = await getSession();
    if (!session?.user) throw new Error("Phiên quản trị đã hết hạn. Hãy đăng nhập lại.");
    const result = await publishContent(normalizedContent, session.user.id);
    setContent(result.content);
    setError("");
    return result.content;
  }, []);

  const resetContent = useCallback(async () => {
    const defaultContent = cloneDefaultSiteContent();
    if (isSupabaseConfigured) {
      await saveContent(defaultContent);
    } else {
      setContent(defaultContent);
    }
    return defaultContent;
  }, [saveContent]);

  const replaceContent = useCallback((nextContent) => setContent(normalizeSiteContent(nextContent)), []);

  const value = useMemo(() => ({
    content,
    error,
    loading,
    configured: isSupabaseConfigured,
    replaceContent,
    resetContent,
    saveContent,
  }), [content, error, loading, replaceContent, resetContent, saveContent]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) throw new Error("useSiteContent must be used inside SiteContentProvider");
  return context;
}
