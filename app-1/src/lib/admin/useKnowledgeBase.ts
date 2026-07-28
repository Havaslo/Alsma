import { useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";

import {
  loadKnowledgeBase,
  publishKnowledgeArticle,
  saveKnowledgeArticle,
  saveKnowledgeRule,
  testKnowledgeAnswer,
} from "@/lib/admin/knowledge-base-api";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useApiQuery } from "@/lib/query/use-api-query";

export const KNOWLEDGE_BASE_QUERY_KEY = ["admin-knowledge-base"] as const;
export const useKnowledgeBase = () =>
  useApiQuery(KNOWLEDGE_BASE_QUERY_KEY, (signal) => loadKnowledgeBase(signal));

const useKnowledgeMutation = <TData, TVariables>(
  request: (variables: TVariables) => Promise<AxiosResponse<TData>>,
  successMessage: string,
) => {
  const client = useQueryClient();
  return useApiMutation(request, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: KNOWLEDGE_BASE_QUERY_KEY }),
    successMessage,
  });
};

export const useSaveKnowledgeArticle = () =>
  useKnowledgeMutation(saveKnowledgeArticle, "Статья сохранена");
export const usePublishKnowledgeArticle = () =>
  useKnowledgeMutation(publishKnowledgeArticle, "Статья опубликована");
export const useSaveKnowledgeRule = () =>
  useKnowledgeMutation(saveKnowledgeRule, "Правило сохранено");
export const useTestKnowledgeAnswer = () =>
  useKnowledgeMutation(testKnowledgeAnswer, "Проверка выполнена");
