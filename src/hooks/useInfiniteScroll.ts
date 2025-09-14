import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number; // Distance from bottom in pixels
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 100
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading) {
        // Save current scroll position before loading more
        const scrollArea = target.target.closest('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          scrollPositionRef.current = scrollArea.scrollTop;
        }
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    if (!loadMoreRef.current) return;

    // Find the ScrollArea viewport as the root for intersection observer
    const scrollArea = loadMoreRef.current.closest('[data-radix-scroll-area-viewport]');
    
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: scrollArea, // Use ScrollArea viewport as root
      rootMargin: `${threshold}px`,
      threshold: 0.1,
    });

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold]);

  // Preserve scroll position after loading more content
  useEffect(() => {
    if (!isLoading && scrollPositionRef.current > 0) {
      const scrollArea = loadMoreRef.current?.closest('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          scrollArea.scrollTop = scrollPositionRef.current;
          scrollPositionRef.current = 0;
        }, 50);
      }
    }
  }, [isLoading]);

  return loadMoreRef;
}