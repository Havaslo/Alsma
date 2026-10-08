import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  contentFactoryErrorMessage,
  generateContentFactoryImage,
  generateContentFactoryText,
  loadContentFactoryDrafts,
  loadContentFactoryGuidelines,
  loadContentFactoryMedia,
  refineContentFactoryText,
  saveContentFactoryDraft,
  uploadContentFactoryMedia,
} from "@/lib/content-factory/contentFactoryApi";
import {
  type ContentChannel,
  MEDIA_ITEMS,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryDraftSnapshot,
  ImageGenerationMode,
  SavedContentFactoryDraft,
  TextRefinementAction,
  UploadedContentFactoryMedia,
} from "@/lib/content-factory/contentFactoryTypes";

const draftsQueryKey = ["content-factory", "drafts"] as const;
const mediaQueryKey = ["content-factory", "media"] as const;
const guidelinesQueryKey = ["content-factory", "guidelines"] as const;

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
  const guidelinesQuery = useQuery({
    queryFn: ({ signal }) => loadContentFactoryGuidelines(signal),
    queryKey: guidelinesQueryKey,
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
  const generateTextMutation = useMutation({
    mutationFn: generateContentFactoryText,
  });
  const refineTextMutation = useMutation({
    mutationFn: refineContentFactoryText,
  });
  const generateImageMutation = useMutation({
    mutationFn: generateContentFactoryImage,
    onSuccess: async (generated) => {
      await queryClient.cancelQueries({ queryKey: mediaQueryKey });
      const generatedMedia = [
        ...new Map(
          Object.values(generated)
            .flatMap((media) => media ?? [])
            .map((media) => [media.id, media] as const),
        ).values(),
      ];
      const generatedIds = new Set(generatedMedia.map((media) => media.id));
      queryClient.setQueryData<UploadedContentFactoryMedia[]>(
        mediaQueryKey,
        (current = []) => [
          ...generatedMedia,
          ...current.filter((media) => !generatedIds.has(media.id)),
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
    guidelines: guidelinesQuery.data ?? null,
    draftsError: draftsQuery.error
      ? contentFactoryErrorMessage(
          draftsQuery.error,
          "Не удалось загрузить сохранённые черновики.",
        )
      : "",
    isLoadingDrafts: draftsQuery.isLoading,
    isLoadingMedia: mediaQuery.isLoading,
    isGeneratingImage: generateImageMutation.isPending,
    isGeneratingText: generateTextMutation.isPending,
    isRefiningText: refineTextMutation.isPending,
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
    generateText: (input: {
      prompt: string;
      selectedChannels: ContentChannel[];
      reference: (typeof mediaItems)[number];
    }) => generateTextMutation.mutateAsync(input),
    refineText: (input: {
      action: TextRefinementAction;
      currentText: string;
      customInstruction?: string;
      prompt: string;
      selectedChannels: ContentChannel[];
      reference: (typeof mediaItems)[number];
    }) => refineTextMutation.mutateAsync(input),
    generateImage: (input: {
      imageCount: number;
      mode: ImageGenerationMode;
      prompt: string;
      postText: string;
      selectedChannels: ContentChannel[];
      references: (typeof mediaItems)[number][];
    }) => generateImageMutation.mutateAsync(input),
  };
};
