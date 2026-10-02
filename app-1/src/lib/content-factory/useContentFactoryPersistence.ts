import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  contentFactoryErrorMessage,
  loadContentFactoryDrafts,
  loadContentFactoryMedia,
  saveContentFactoryDraft,
  uploadContentFactoryMedia,
} from "@/lib/content-factory/contentFactoryApi";
import { MEDIA_ITEMS } from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryDraftSnapshot,
  SavedContentFactoryDraft,
  UploadedContentFactoryMedia,
} from "@/lib/content-factory/contentFactoryTypes";

const draftsQueryKey = ["content-factory", "drafts"] as const;
const mediaQueryKey = ["content-factory", "media"] as const;

export const useContentFactoryPersistence = () => {
  const queryClient = useQueryClient();
  const draftsQuery = useQuery({
    queryFn: ({ signal }) => loadContentFactoryDrafts(signal),
    queryKey: draftsQueryKey,
  });
  const mediaQuery = useQuery({
    queryFn: ({ signal }) => loadContentFactoryMedia(signal),
    queryKey: mediaQueryKey,
  });
  const saveDraftMutation = useMutation({
    mutationFn: (input: {
      draftId: string | null;
      snapshot: ContentFactoryDraftSnapshot;
      title: string;
    }) =>
      saveContentFactoryDraft(input.draftId, {
        snapshot: input.snapshot,
        title: input.title,
      }),
    onSuccess: async (saved) => {
      await queryClient.cancelQueries({ queryKey: draftsQueryKey });
      queryClient.setQueryData<SavedContentFactoryDraft[]>(
        draftsQueryKey,
        (current = []) =>
          [saved, ...current.filter((draft) => draft.id !== saved.id)].sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() -
              new Date(left.updatedAt).getTime(),
          ),
      );
    },
  });
  const uploadMediaMutation = useMutation({
    mutationFn: (file: File) => uploadContentFactoryMedia(file),
    onSuccess: async (uploaded) => {
      await queryClient.cancelQueries({ queryKey: mediaQueryKey });
      queryClient.setQueryData<UploadedContentFactoryMedia[]>(
        mediaQueryKey,
        (current = []) => [
          uploaded,
          ...current.filter((media) => media.id !== uploaded.id),
        ],
      );
    },
  });

  const mediaItems = useMemo(
    () => [...(mediaQuery.data ?? []), ...MEDIA_ITEMS],
    [mediaQuery.data],
  );

  return {
    drafts: draftsQuery.data ?? [],
    draftsError: draftsQuery.error
      ? contentFactoryErrorMessage(
          draftsQuery.error,
          "Не удалось загрузить сохранённые черновики.",
        )
      : "",
    isLoadingDrafts: draftsQuery.isLoading,
    isLoadingMedia: mediaQuery.isLoading,
    isUploadingMedia: uploadMediaMutation.isPending,
    mediaError: mediaQuery.error
      ? contentFactoryErrorMessage(
          mediaQuery.error,
          "Не удалось загрузить фотографии медиатеки.",
        )
      : "",
    mediaItems,
    refreshDrafts: draftsQuery.refetch,
    refreshMedia: mediaQuery.refetch,
    saveDraft: (
      draftId: string | null,
      input: { snapshot: ContentFactoryDraftSnapshot; title: string },
    ) => saveDraftMutation.mutateAsync({ draftId, ...input }),
    uploadMedia: (file: File) => uploadMediaMutation.mutateAsync(file),
  };
};
