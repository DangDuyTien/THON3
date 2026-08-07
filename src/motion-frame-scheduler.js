import { updateAllScenes } from "./motion-runtime.js";

const continuousFrameSubscribers = new Set();
let pendingFrameReasons = new Set();
let scheduledFrame = null;

function scheduleSharedFrame() {
  if (scheduledFrame !== null || document.hidden) return;
  scheduledFrame = window.requestAnimationFrame(flushMotionFrame);
}

function flushMotionFrame(time) {
  scheduledFrame = null;
  const reasons = pendingFrameReasons;
  pendingFrameReasons = new Set();

  if (reasons.size) updateAllScenes();
  continuousFrameSubscribers.forEach((callback) => callback(time, reasons));

  if (continuousFrameSubscribers.size) scheduleSharedFrame();
}

export function queueMotionFrame(reason = "runtime") {
  pendingFrameReasons.add(typeof reason === "string" ? reason : "scroll");
  scheduleSharedFrame();
}

export function subscribeContinuousFrame(callback) {
  continuousFrameSubscribers.add(callback);
  queueMotionFrame("continuous");

  return () => {
    continuousFrameSubscribers.delete(callback);

    if (!continuousFrameSubscribers.size && !pendingFrameReasons.size && scheduledFrame !== null) {
      window.cancelAnimationFrame(scheduledFrame);
      scheduledFrame = null;
    }
  };
}
