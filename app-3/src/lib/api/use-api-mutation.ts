import { useMutation } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/api-error";

type MutationRequest<TData, TVariables> = (
  variables: TVariables,
) => Promise<AxiosResponse<TData>>;

type ApiMutationOptions<TData, TVariables> = {
  readonly errorMessage?: string;
  readonly onError?: (error: Error, variables: TVariables) => void;
  readonly onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
  ) => void;
  readonly onSuccess?: (data: TData, variables: TVariables) => void;
  readonly successMessage?: string;
};

export const useApiMutation = <TData, TVariables>(
  request: MutationRequest<TData, TVariables>,
  options: ApiMutationOptions<TData, TVariables> = {},
) => {
  return useMutation({
    mutationFn: async (variables: TVariables) =>
      (await request(variables)).data,
    onError: (error, variables) => {
      toast.error(
        options.errorMessage ||
          getApiErrorMessage(error, "The request could not be completed."),
      );
      options.onError?.(error, variables);
    },
    onSettled: (data, error, variables) => {
      options.onSettled?.(data, error, variables);
    },
    onSuccess: (data, variables) => {
      if (options.successMessage) {
        toast.success(options.successMessage);
      }

      options.onSuccess?.(data, variables);
    },
  });
};
