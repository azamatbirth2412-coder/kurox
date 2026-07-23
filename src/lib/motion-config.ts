"use client";
import { motionTokens } from "./motion-tokens";

export const motionConfig = {
  isLowEnd(): boolean {
    return (
      typeof navigator !== "undefined" &&
      (navigator as any).hardwareConcurrency <= 4
    );
  },

  prefersReduced(): boolean {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  },

  shouldAnimate({ essential = false } = {}): boolean {
    if (this.prefersReduced()) return false;
    if (!essential && this.isLowEnd()) return false;
    return true;
  },

  duration(): number {
    return this.isLowEnd() || this.prefersReduced()
      ? motionTokens.duration.instant
      : motionTokens.duration.normal;
  },
};
