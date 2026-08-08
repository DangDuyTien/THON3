import { updateAllScenes } from "./motion-runtime.js";

const continuousFrameSubscribers = new Map();
let pendingFrameReasons = new Set();
let scheduledFrame = null;
let frameNumber = 0;

function scheduleSharedFrame() {
  if (scheduledFrame !== null || document.hidden) return;
  scheduledFrame = window.requestAnimationFrame(flushMotionFrame);
}

function flushMotionFrame(time) {
  scheduledFrame = null;
  const reasons = pendingFrameReasons;
  pendingFrameReasons = new Set();
  frameNumber += 1;

  continuousFrameSubscribers.forEach((subscriber) => {
    subscriber.callback(time, reasons);
  });
  if (reasons.size) updateAllScenes();

  if (continuousFrameSubscribers.size) scheduleSharedFrame();
}

export function queueMotionFrame(reason = "runtime") {
  pendingFrameReasons.add(typeof reason === "string" ? reason : "scroll");
  scheduleSharedFrame();
}

export function subscribeContinuousFrame(callback, options = {}) {
  const subscriber = { callback };
  continuousFrameSubscribers.set(callback, subscriber);
  queueMotionFrame("continuous");

  return () => {
    continuousFrameSubscribers.delete(callback);

    if (!continuousFrameSubscribers.size && !pendingFrameReasons.size && scheduledFrame !== null) {
      window.cancelAnimationFrame(scheduledFrame);
      scheduledFrame = null;
    }
  };
}
