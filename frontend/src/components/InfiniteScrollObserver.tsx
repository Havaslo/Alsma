import { Loader } from "@/components/ui/Loader";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

export type InfiniteScrollObserverProps = {
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onLoadMore: () => void;
};

export const InfiniteScrollObserver = ({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: InfiniteScrollObserverProps) => {
  const observerRef = useIntersectionObserver<HTMLDivElement>({
    enabled: hasNextPage && !isFetchingNextPage,
    onIntersect: onLoadMore,
    rootMargin: "200px 0px",
  });

  if (!hasNextPage) {
    return null;
  }

  return (
    <div
      ref={observerRef}
      aria-live="polite"
      className="flex min-h-10 items-center justify-center"
      role="status"
    >
      {isFetchingNextPage ? (
        <Loader label="Loading more" />
      ) : (
        <span className="sr-only">
          More items load when this area is visible.
        </span>
      )}
    </div>
  );
};
