import { useEffect } from "react";
import { mountContourRenderer } from "../contour-runtime.js";
import {
  queueMotionFrame,
  subscribeContinuousFrame,
} from "../motion-frame-scheduler.js";

export default function PageContour({ canvasRef, className = "page-contour-canvas", reducedMotion, sceneName = "page-contour" }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return undefined;

    return mountContourRenderer(canvas, {
      queueFrame: queueMotionFrame,
      subscribeAnimationFrame: subscribeContinuousFrame,
    }, { sceneName });
  }, [canvasRef, reducedMotion, sceneName]);

  return reducedMotion ? null : <canvas className={className} ref={canvasRef} aria-hidden="true" />;
}
