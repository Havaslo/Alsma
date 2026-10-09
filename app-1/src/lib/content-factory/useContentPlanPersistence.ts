import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import type {
  ContentPlanPostInput,
  ContentPlanPublishingStatus,
} from "@/lib/content-factory/contentFactoryTypes";
import {
  approveContentPlanPost,
  cancelContentPlanPost,
  createManualContentPlanPosts,
  generateContentPlanPosts,
  loadContentPlanPosts,
  loadContentPlanPublishingStatus,
  previewContentPlanFile,
  retryContentPlanPost,
  scheduleContentPlanPost,
  updateContentPlanPost,
} from "@/lib/content-factory/contentPlanApi";
import { mapContentPlanPost } from "@/lib/content-factory/contentPlanMapper";

const postsQueryKey = ["content-factory", "plan-posts"] as const;
const isGenerationPending = (status: string) =>
  status === "queued" || status === "generating";

export const useContentPlanPersistence = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: postsQueryKey,
    queryFn: ({ signal }) => loadContentPlanPosts(signal),
    refetchInterval: (current) =>
      current.state.data?.some((post) => isGenerationPending(post.status))
        ? 1_500
        : false,
  });
  const publishingStatusQuery = useQuery({
    queryKey: ["content-factory", "publishing-status"],
    queryFn: loadContentPlanPublishingStatus,
    staleTime: 30_000,
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: postsQueryKey });
  const generateMutation = useMutation({
    mutationFn: (input: { fileName: string; posts: ContentPlanPostInput[] }) =>
      generateContentPlanPosts(input),
    onSuccess: refresh,
  });
  const createManualMutation = useMutation({
    mutationFn: createManualContentPlanPosts,
    onSuccess: refresh,
  });
  const updateMutation = useMutation({
    mutationFn: (input: {
      postId: string;
      date?: string;
      time?: string;
      title?: string;
      text?: string;
    }) => {
      const { postId, ...changes } = input;
      return updateContentPlanPost(postId, changes);
    },
    onSuccess: refresh,
  });
  const approveMutation = useMutation({
    mutationFn: approveContentPlanPost,
    onSuccess: refresh,
  });
  const cancelMutation = useMutation({
    mutationFn: cancelContentPlanPost,
    onSuccess: refresh,
  });
  const retryMutation = useMutation({
    mutationFn: retryContentPlanPost,
    onSuccess: refresh,
  });
  const scheduleMutation = useMutation({
    mutationFn: scheduleContentPlanPost,
    onSuccess: refresh,
  });

  const mappedPosts = useMemo(
    () => (query.data ?? []).map(mapContentPlanPost),
    [query.data],
  );
  return {
    error: query.error
      ? contentFactoryErrorMessage(
          query.error,
          "Не удалось загрузить контент-план.",
        )
      : "",
    isLoading: query.isLoading,
    isGenerating: generateMutation.isPending,
    isUpdating: updateMutation.isPending,
    isApproving: approveMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isRetrying: retryMutation.isPending,
    isScheduling: scheduleMutation.isPending,
    publishingStatus: (publishingStatusQuery.data ??
      null) as ContentPlanPublishingStatus | null,
    posts: mappedPosts,
    previewFile: previewContentPlanFile,
    generatePlan: (input: {
      fileName: string;
      posts: ContentPlanPostInput[];
    }) => generateMutation.mutateAsync(input),
    createManualPosts: (
      input: Parameters<typeof createManualContentPlanPosts>[0],
    ) => createManualMutation.mutateAsync(input),
    updatePost: (input: {
      postId: string;
      date?: string;
      time?: string;
      title?: string;
      text?: string;
    }) => updateMutation.mutateAsync(input),
    approvePost: (postId: string) => approveMutation.mutateAsync(postId),
    cancelPost: (postId: string) => cancelMutation.mutateAsync(postId),
    retryPost: (postId: string) => retryMutation.mutateAsync(postId),
    schedulePost: (postId: string) => scheduleMutation.mutateAsync(postId),
    refresh: query.refetch,
  };
};
