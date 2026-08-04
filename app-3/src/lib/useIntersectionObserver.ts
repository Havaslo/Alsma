import { useCallback, useEffect, useRef } from "react";

export type UseIntersectionObserverOptions = {
  readonly enabled?: boolean;
  readonly onIntersect: () => void;
  readonly root?: Element | null;
  readonly rootMargin?: string;
  readonly threshold?: number | readonly number[];
};

export const useIntersectionObserver = <TElement extends Element = Element>({
  enabled = true,
  onIntersect,
  root = null,
  rootMargin = "0px",
  threshold = 0,
}: UseIntersectionObserverOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  return useCallback(
    (element: TElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!element || !enabled || typeof IntersectionObserver === "undefined") {
        return;
      }

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            onIntersectRef.current();
          }
        },
        {
          root,
          rootMargin,
          threshold: [...(Array.isArray(threshold) ? threshold : [threshold])],
        },
      );
      observerRef.current.observe(element);
    },
    [enabled, root, rootMargin, threshold],
  );
};
