import { apiClient } from "@/lib/api/api-client";

export type LeadInput = {
  readonly checkInDate?: string;
  readonly checkOutDate?: string;
  readonly formCode: string;
  readonly formTitle: string;
  readonly guestsCount?: number;
  readonly name?: string;
  readonly phone?: string;
  readonly sourcePage: string;
};

export const createLead = (input: LeadInput) =>
  apiClient.post<{ lead: { id: string; status: string } }>(
    "/site-leads",
    input,
  );
