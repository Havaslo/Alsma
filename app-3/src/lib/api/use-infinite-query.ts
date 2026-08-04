import { useEffect, useRef } from "react";

import {
  type QueryKey,
  useInfiniteQuery as useTanStackInfiniteQuery,
} from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/api-error";
import { DEFAULT_PAGE, type PaginatedResponse } from "@/lib/api/pagination";

type InfiniteQueryRequest<TItem> = (
  page: number,
  signal: AbortSignal,
) => Promise<AxiosResponse<PaginatedResponse<TItem>>>;

type InfiniteQueryOptions = {
  readonly errorMessage?: string;
};

export const useInfiniteQuery = <TItem>(
  queryKey: QueryKey,
  request: InfiniteQueryRequest<TItem>,
  options: InfiniteQueryOptions = {},
) => {
  const query = useTanStackInfiniteQuery({
    getNextPageParam: (lastPage: PaginatedResponse<TItem>) => {
      const { page, totalPages } = lastPage.pagination;

      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: DEFAULT_PAGE,
    queryFn: async ({ pageParam, signal }): Promise<PaginatedResponse<TItem>> =>
      (await request(pageParam, signal)).data,
    queryKey,
  });

  const errorMessageRef = useRef(options.errorMessage);
  const handledErrorUpdatedAt = useRef(query.errorUpdatedAt);

  useEffect(() => {
    errorMessageRef.current = options.errorMessage;
  }, [options.errorMessage]);

  useEffect(() => {
    if (!query.error || query.errorUpdatedAt <= handledErrorUpdatedAt.current) {
      return;
    }

    handledErrorUpdatedAt.current = query.errorUpdatedAt;
    toast.error(
      errorMessageRef.current ||
        getApiErrorMessage(query.error, "More items could not be loaded."),
    );
  }, [query.error, query.errorUpdatedAt]);

  return {
    ...query,
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
  };
};
