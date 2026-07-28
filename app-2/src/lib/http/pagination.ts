import { z } from "zod";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

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

export const getPaginationRange = ({ page, pageSize }: PaginationQuery) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

export const createPaginatedResponse = <TItem>(
  items: readonly TItem[],
  totalItems: number,
  { page, pageSize }: PaginationQuery,
): PaginatedResponse<TItem> => {
  if (!Number.isSafeInteger(totalItems) || totalItems < 0) {
    throw new RangeError(
      "Pagination totalItems must be a non-negative safe integer.",
    );
  }

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
};
