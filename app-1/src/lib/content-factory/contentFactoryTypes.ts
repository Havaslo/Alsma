import type {
  ContentChannel,
  DraftVariant,
  FactoryMediaItem,
} from "@/lib/content-factory/contentFactoryData";

export type DraftAction = "shorter" | "regenerate" | "sales" | "calmer";
export type TextRefinementAction = DraftAction | "custom";

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

export interface ContentFactoryChannelGuideline {
  id: ContentChannel;
  label: string;
  copy: string;
  image: {
    ratio: string;
    dimensions: string;
    format: string;
    apiSize: string;
    outputWidth: number;
    outputHeight: number;
    note: string;
  };
  gallery: string;
}

export interface ContentFactoryGuidelines {
  models: { text: string; image: string };
  channels: ContentFactoryChannelGuideline[];
}
