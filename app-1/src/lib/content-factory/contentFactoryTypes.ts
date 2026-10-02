import type {
  ContentChannel,
  DraftVariant,
  FactoryMediaItem,
} from "@/lib/content-factory/contentFactoryData";

export type DraftAction = "shorter" | "regenerate" | "sales" | "calmer";

export type WorkspaceSection = "create" | "plan" | "media" | "history";

export interface ContentFactoryDraftSnapshot {
  prompt: string;
  selectedChannels: ContentChannel[];
  variantIndex: number;
  variants: DraftVariant[];
}

export interface SavedContentFactoryDraft {
  id: string;
  title: string;
  snapshot: ContentFactoryDraftSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedContentFactoryMedia extends FactoryMediaItem {
  contentType: string;
  createdAt: string;
  sizeBytes: number;
}
