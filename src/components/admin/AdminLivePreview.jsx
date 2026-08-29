import { RotateCcw, Smartphone, Tablet, Monitor } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getAdminPublicTarget, getAdminSection, getPublicHomeHref } from "./admin-registry.js";

const PREVIEW_MESSAGE = "thon3-admin-preview";

const VIEWPORTS = {
  desktop: { label: "Desktop", width: 1440, height: 900, icon: Monitor },
  tablet: { label: "Tablet", width: 820, height: 1000, icon: Tablet },
  mobile: { label: "Mobile", width: 390, height: 844, icon: Smartphone },
};


export default function AdminLivePreview({ draft, activeSection, dirty, focusTarget }) {
  const iframeRef = useRef(null);
  const stageRef = useRef(null);
  const pendingPayloadRef = useRef(null);
  const sendTimerRef = useRef(0);
  const [viewport, setViewport] = useState("desktop");
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const viewportConfig = VIEWPORTS[viewport];

  const previewSrc = useMemo(() => `${getPublicHomeHref(typeof window === "undefined" ? "/" : window.location.pathname, "site-preview")}&v=${reloadVersion}`, [reloadVersion]);
  const sectionTarget = getAdminPublicTarget(activeSection);

  const sendPreviewMessage = (payload) => {
    pendingPayloadRef.current = payload;
    iframeRef.current?.contentWindow?.postMessage({ source: PREVIEW_MESSAGE, ...payload }, window.location.origin);
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.source === PREVIEW_MESSAGE && event.data.type === "ready") {
        setReady(true);
        if (pendingPayloadRef.current) sendPreviewMessage(pendingPayloadRef.current);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return undefined;

    const updateScale = () => {
      const bounds = stage.getBoundingClientRect();
      const nextScale = Math.min(
        Math.max((bounds.width - 24) / viewportConfig.width, 0.1),
        Math.max((bounds.height - 24) / viewportConfig.height, 0.1),
        1,
      );
      setScale(nextScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [viewportConfig.height, viewportConfig.width]);

  useEffect(() => {
    if (!ready) return undefined;
    window.clearTimeout(sendTimerRef.current);
    sendTimerRef.current = window.setTimeout(() => {
      sendPreviewMessage({
        type: "content",
        content: draft,
        sectionTarget,
        focusTarget: focusTarget || "",
      });
    }, 140);
    return () => window.clearTimeout(sendTimerRef.current);
  }, [activeSection, draft, focusTarget, ready]);

  const handleReload = () => {
    setReady(false);
    setReloadVersion((current) => current + 1);
  };

  return (
    <section className="admin-preview-workspace" aria-label="Xem trước trực tiếp trang chủ">
      <div className="admin-preview-toolbar">
        <div className="admin-preview-toolbar-copy">
          <span className={`admin-preview-live-dot${ready ? " is-ready" : ""}`} aria-hidden="true" />
          <div>
            <strong>{ready ? `Xem trước: ${getAdminSection(activeSection).label}` : "Đang mở trang xem trước…"}</strong>
            <small>{dirty ? "Đang hiển thị bản nháp — trang chủ chưa thay đổi" : "Nội dung đã đồng bộ với trang chủ"}</small>
          </div>
        </div>
        <div className="admin-preview-toolbar-actions">
          <div className="admin-preview-devices" aria-label="Kích thước màn hình xem trước">
            {Object.entries(VIEWPORTS).map(([key, option]) => {
              const Icon = option.icon;
              return (
                <button
                  className={viewport === key ? "is-active" : ""}
                  type="button"
                  key={key}
                  onClick={() => setViewport(key)}
                  aria-pressed={viewport === key}
                  title={`Xem ở chế độ ${option.label}`}
                >
                  <Icon aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
          <button className="admin-preview-reload" type="button" onClick={handleReload} title="Tải lại trang xem trước" aria-label="Tải lại trang xem trước">
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="admin-preview-device-stage" ref={stageRef}>
        <div
          className={`admin-preview-device is-${viewport}`}
          style={{
            "--preview-device-width": `${viewportConfig.width}px`,
            "--preview-device-height": `${viewportConfig.height}px`,
            "--preview-device-scale": scale,
          }}
        >
          <div className="admin-preview-device-frame">
            <iframe
              ref={iframeRef}
              src={previewSrc}
              title={`Trang chủ bản nháp ở chế độ ${viewportConfig.label}`}
              onLoad={() => setReady(false)}
            />
          </div>
        </div>
      </div>
      <div className="admin-preview-scale-note" aria-hidden="true">
        <span>{viewportConfig.width} × {viewportConfig.height}</span>
        <span>{Math.round(scale * 100)}%</span>
      </div>
    </section>
  );
}
