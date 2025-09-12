"use client";

import { useCallback } from "react";

export function useViewTransition() {
  const startViewTransition = useCallback((updateFunction: () => void) => {
    // Check if View Transition API is supported
    if ('startViewTransition' in document) {
      (document as Document & { startViewTransition?: (callback: () => void) => void }).startViewTransition?.(updateFunction);
    } else {
      // Fallback for browsers that don't support it
      updateFunction();
    }
  }, []);

  return { startViewTransition };
}