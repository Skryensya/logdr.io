"use client";

import { useCallback } from "react";

export function useViewTransition() {
  const startViewTransition = useCallback((updateFunction: () => void) => {
    // Check if View Transition API is supported
    if ('startViewTransition' in document) {
      // @ts-ignore - View Transition API might not be in types yet
      document.startViewTransition(updateFunction);
    } else {
      // Fallback for browsers that don't support it
      updateFunction();
    }
  }, []);

  return { startViewTransition };
}