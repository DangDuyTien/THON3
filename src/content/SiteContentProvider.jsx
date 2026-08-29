import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cloneDefaultSiteContent, normalizeSiteContent } from "./content-store.js";
import { getPublishedContent, publishContent } from "../lib/content-api.js";
import { isBackendConfigured } from "../lib/backend-api.js";
import { getSession } from "../lib/auth-api.js";

const SiteContentContext = createContext(null);
const CONTENT_SEED_STORAGE_KEY = "me-linh:published-content";
const REQUEST_TIMEOUT_MS = 8000;
const SILENT_RETRY_DELAYS_MS = [5000, 20000, 60000];

// Bản nội dung public lần cuối tải thành công giúp mở trang tức thì mà không chờ DB.
function readSeedContent() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONTENT_SEED_STORAGE_KEY) || "");
    return parsed?.content && typeof parsed.content === "object" ? normalizeSiteContent(parsed.content) : null;
  } catch {
    return null;
  }
}

function writeSeedContent(content) {
  try {
    window.localStorage.setItem(CONTENT_SEED_STORAGE_KEY, JSON.stringify({ content, savedAt: Date.now() }));
  } catch {
    // Seed chỉ là tăng tốc — bỏ qua khi storage đầy hoặc bị chặn.
  }
}

export function SiteContentProvider({ children }) {
  const [seedContent] = useState(readSeedContent);
  const [content, setContent] = useState(() => seedContent ?? cloneDefaultSiteContent());
  const [connectionStatus, setConnectionStatus] = useState({ attempt: 0, cycle: 1, phase: "starting" });
  const [loading, setLoading] = useState(!seedContent);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!isBackendConfigured) {
      setConnectionStatus({ attempt: 0, cycle: 1, phase: "unavailable" });
      setError("Backend MySQL chưa được cấu hình. Hãy đặt VITE_API_BASE_URL.");
      setLoading(false);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const cycle = loadAttempt + 1;
    const retryTimers = [];
    let requestAttempt = 0;
    setConnectionStatus({ attempt: 0, cycle, phase: "starting" });
    setError("");

    // Trang vẫn mở với nội dung mặc định/seed trong khi quá trình tải chạy nền.
    const runAttempt = () => {
      if (!active || controller.signal.aborted) return;
      requestAttempt += 1;
      setConnectionStatus({ attempt: requestAttempt, cycle, phase: "connecting" });
      const requestController = new AbortController();
      const requestTimeout = window.setTimeout(() => requestController.abort(), REQUEST_TIMEOUT_MS);
      controller.signal.addEventListener("abort", () => requestController.abort(), { once: true });

      getPublishedContent({ signal: requestController.signal })
        .then((nextContent) => {
          if (!active) return;
          setContent(nextContent);
          writeSeedContent(nextContent);
          setConnectionStatus({
            attempt: requestAttempt,
            cycle,
            payloadCharacters: JSON.stringify(nextContent).length,
            phase: "connected",
          });
          setError("");
          setLoading(false);
        })
        .catch((loadError) => {
          if (!active || controller.signal.aborted) return;
          const timedOut = loadError?.name === "AbortError";
          const rejected = Boolean(loadError?.status && loadError.status < 500);
          setConnectionStatus({
            attempt: requestAttempt,
            code: timedOut ? "REQUEST_TIMEOUT" : (loadError?.status ? `HTTP_${loadError.status}` : "NETWORK_ERROR"),
            cycle,
            phase: rejected ? "rejected" : timedOut ? "timedOut" : "retrying",
          });
          setError(loadError?.message || "Không thể tải nội dung từ máy chủ.");
          setLoading(false);
          if (!rejected) {
            const delay = SILENT_RETRY_DELAYS_MS[requestAttempt - 1];
            if (delay !== undefined) retryTimers.push(window.setTimeout(runAttempt, delay));
          }
        })
        .finally(() => window.clearTimeout(requestTimeout));
    };

    runAttempt();

    return () => {
      active = false;
      controller.abort();
      retryTimers.forEach((timer) => window.clearTimeout(timer));
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
    writeSeedContent(result.content);
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
    connectionStatus,
    content,
    error,
    loading,
    configured: isBackendConfigured,
    replaceContent,
    resetContent,
    retryLoad,
    saveContent,
  }), [connectionStatus, content, error, loading, replaceContent, resetContent, retryLoad, saveContent]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) throw new Error("useSiteContent must be used inside SiteContentProvider");
  return context;
}
