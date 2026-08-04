import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PaginationRequestParams = Record<string, unknown> & {
  readonly page?: number;
  readonly pageSize?: number;
};

export type PaginationMetadata = {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export type PaginatedResponse<TItem> = {
  readonly items: readonly TItem[];
  readonly pagination: PaginationMetadata;
};

type PaginatedRequestConfig = Omit<AxiosRequestConfig, "params">;

export const withPaginationDefaults = (
  params: PaginationRequestParams = {},
): Required<Pick<PaginationRequestParams, "page" | "pageSize">> &
  PaginationRequestParams => ({
  ...params,
  page: params.page ?? DEFAULT_PAGE,
  pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
});

export const getPaginated = <TItem>(
  apiClient: AxiosInstance,
  path: string,
  params: PaginationRequestParams = {},
  config: PaginatedRequestConfig = {},
): Promise<AxiosResponse<PaginatedResponse<TItem>>> =>
  apiClient.get<PaginatedResponse<TItem>>(path, {
    ...config,
    params: withPaginationDefaults(params),
  });
