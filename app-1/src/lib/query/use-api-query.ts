import { useEffect, useRef } from "react";

import { type QueryKey, useQuery } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/api-error";

type QueryRequest<TData> = (signal: AbortSignal) => Promise<AxiosResponse<TData>>;
type ApiQueryOptions<TData> = { readonly enabled?: boolean; readonly errorMessage?: string; readonly onError?: (error: Error) => void; readonly onSettled?: (data: TData | undefined, error: Error | null) => void; readonly onSuccess?: (data: TData) => void; readonly refetchInterval?: number; readonly successMessage?: string };
export const useApiQuery = <TData>(queryKey: QueryKey, request: QueryRequest<TData>, options: ApiQueryOptions<TData> = {}) => {
  const query = useQuery({ enabled: options.enabled, queryFn: async ({ signal }) => (await request(signal)).data, queryKey, refetchInterval: options.refetchInterval });
  const optionsRef = useRef(options); const handledDataUpdatedAt = useRef(query.dataUpdatedAt); const handledErrorUpdatedAt = useRef(query.errorUpdatedAt);
  useEffect(() => { optionsRef.current = options; }, [options]);
  useEffect(() => { if (!query.isSuccess || query.dataUpdatedAt <= handledDataUpdatedAt.current) return; handledDataUpdatedAt.current = query.dataUpdatedAt; const currentOptions = optionsRef.current; if (currentOptions.successMessage) toast.success(currentOptions.successMessage); currentOptions.onSuccess?.(query.data); currentOptions.onSettled?.(query.data, null); }, [query.data, query.dataUpdatedAt, query.isSuccess]);
  useEffect(() => { if (!query.error || query.errorUpdatedAt <= handledErrorUpdatedAt.current) return; handledErrorUpdatedAt.current = query.errorUpdatedAt; const currentOptions = optionsRef.current; toast.error(currentOptions.errorMessage || getApiErrorMessage(query.error, "The data could not be loaded.")); currentOptions.onError?.(query.error); currentOptions.onSettled?.(query.data, query.error); }, [query.data, query.error, query.errorUpdatedAt]);
  return query;
};
