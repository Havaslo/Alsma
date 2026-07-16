import { createLead } from "@/lib/leads/leads-api";
import { useApiMutation } from "@/lib/query/use-api-mutation";

export const useCreateLead = () =>
  useApiMutation(createLead, {
    successMessage: "Заявка отправлена. Мы скоро свяжемся с вами.",
  });
