import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cloneDefaultSiteContent, normalizeSiteContent } from "./content-store.js";
import { getPublishedContent, publishContent } from "../lib/content-api.js";
import { isBackendConfigured } from "../lib/backend-api.js";
import { getSession } from "../lib/auth-api.js";

const SiteContentContext = createContext(null);
const BOOT_RETRY_DELAY_MS = 2000;
const BOOT_TIMEOUT_MS = 60000;

function waitForRetry(signal) {
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = window.setTimeout(finish, BOOT_RETRY_DELAY_MS);
    signal.addEventListener("abort", finish, { once: true });
  });
}

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(cloneDefaultSiteContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!isBackendConfigured) {
      setError("Backend MySQL chưa được cấu hình. Hãy đặt VITE_API_BASE_URL.");
      setLoading(false);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), BOOT_TIMEOUT_MS);
    setError("");
    setLoading(true);

    const loadPublishedContent = async () => {
      let lastError = null;

      while (active && !controller.signal.aborted) {
        try {
          const nextContent = await getPublishedContent({ signal: controller.signal });
          if (!active) return;
          window.clearTimeout(timeout);
          setContent(nextContent);
          setError("");
          setLoading(false);
          return;
        } catch (loadError) {
          lastError = loadError;
          if (controller.signal.aborted || (loadError?.status && loadError.status < 500)) break;
          await waitForRetry(controller.signal);
        }
      }

      if (!active) return;
      setError(controller.signal.aborted
        ? "Máy chủ chưa phản hồi sau 60 giây. Hãy thử kết nối lại."
        : lastError?.message || "Không thể tải nội dung từ máy chủ.");
      setLoading(false);
    };

    loadPublishedContent();

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadAttempt]);

  const retryLoad = useCallback(() => setLoadAttempt((attempt) => attempt + 1), []);

  const saveContent = useCallback(async (nextContent) => {
    if (!isBackendConfigured) throw new Error("Backend MySQL chưa được cấu hình.");
    const normalizedContent = normalizeSiteContent(nextContent);
    const session = await getSession();
    if (!session?.user) throw new Error("Phiên quản trị đã hết hạn. Hãy đăng nhập lại.");
    const result = await publishContent(normalizedContent, session.user.id);
    setContent(result.content);
    setError("");
    return result.content;
  }, []);

  const resetContent = useCallback(async () => {
    const defaultContent = cloneDefaultSiteContent();
    await saveContent(defaultContent);
    return defaultContent;
  }, [saveContent]);

  const replaceContent = useCallback((nextContent) => setContent(normalizeSiteContent(nextContent)), []);

  const value = useMemo(() => ({
    content,
    error,
    loading,
    configured: isBackendConfigured,
    replaceContent,
    resetContent,
    retryLoad,
    saveContent,
  }), [content, error, loading, replaceContent, resetContent, retryLoad, saveContent]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) throw new Error("useSiteContent must be used inside SiteContentProvider");
  return context;
}
