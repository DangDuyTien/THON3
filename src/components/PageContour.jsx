import { useEffect } from "react";
import { mountContourRenderer } from "../contour-runtime.js";
import {
  queueMotionFrame,
  subscribeContinuousFrame,
} from "../motion-frame-scheduler.js";

export default function PageContour({ canvasRef, reducedMotion }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return undefined;

    return mountContourRenderer(canvas, {
      queueFrame: queueMotionFrame,
      subscribeAnimationFrame: subscribeContinuousFrame,
    });
  }, [canvasRef, reducedMotion]);

  return reducedMotion ? null : <canvas className="page-contour-canvas" ref={canvasRef} aria-hidden="true" />;
}
