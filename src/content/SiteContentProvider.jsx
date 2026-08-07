import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  cloneDefaultSiteContent,
  loadSiteContent,
  normalizeSiteContent,
  persistSiteContent,
  SITE_CONTENT_STORAGE_KEY,
} from "./content-store.js";

const SiteContentContext = createContext(null);

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(loadSiteContent);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event && event.key && event.key !== SITE_CONTENT_STORAGE_KEY) return;
      setContent(loadSiteContent());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("site-content-updated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("site-content-updated", handleStorage);
    };
  }, []);

  const saveContent = useCallback((nextContent) => {
    const normalizedContent = persistSiteContent(nextContent);
    setContent(normalizedContent);
    return normalizedContent;
  }, []);

  const resetContent = useCallback(() => {
    const defaultContent = cloneDefaultSiteContent();
    window.localStorage.removeItem(SITE_CONTENT_STORAGE_KEY);
    setContent(defaultContent);
    return defaultContent;
  }, []);

  const replaceContent = useCallback((nextContent) => {
    setContent(normalizeSiteContent(nextContent));
  }, []);

  const value = useMemo(() => ({
    content,
    replaceContent,
    resetContent,
    saveContent,
  }), [content, replaceContent, resetContent, saveContent]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) throw new Error("useSiteContent must be used inside SiteContentProvider");
  return context;
}
