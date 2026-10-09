import type {
  ContentChannel,
  DraftVariant,
  FactoryMediaItem,
} from "@/lib/content-factory/contentFactoryData";

export type DraftAction = "shorter" | "regenerate" | "sales" | "calmer";
export type TextRefinementAction = DraftAction | "custom";
export type ImageGenerationMode = "edit" | "generate";

export type WorkspaceSection = "create" | "plan" | "media" | "history";
export type ContentFactoryImageSourceMode =
  "automatic" | "library" | "generate";

export interface ContentFactoryBrief {
  postType: string;
  format: string;
  audience: string;
  keyFacts: string;
  callToAction: string;
  styleGuidance: string;
  imagePrompt: string;
  sourceImageRecommendation: string;
}

export interface ContentFactoryDraftSnapshot {
  prompt: string;
  selectedChannels: ContentChannel[];
  variantIndex: number;
  variants: DraftVariant[];
  brief?: ContentFactoryBrief;
  imageCount?: number;
  imageSourceMode?: ContentFactoryImageSourceMode;
}

export interface SavedContentFactoryDraft {
  id: string;
  title: string;
  snapshot: ContentFactoryDraftSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPlanPostInput {
  sourceRow: number;
  date: string;
  time: string;
  postType: string;
  channel: ContentChannel;
  format: string;
  topic: string;
  audience: string;
  keyFacts: string;
  callToAction: string;
  styleGuidance: string;
  imagePrompt: string;
  sourceImageRecommendation: string;
}

export type ContentPlanPostStatus =
  | "queued"
  | "generating"
  | "needs_review"
  | "approved"
  | "generation_failed"
  | "cancelled";

export interface ContentPlanPostRecord extends ContentPlanPostInput {
  id: string;
  importId: string;
  title: string;
  text: string;
  imageIds?: string[];
  status: ContentPlanPostStatus;
  generationError: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  import: { fileName: string };
}

export interface ContentPlanPreview {
  fileName: string;
  posts: ContentPlanPostInput[];
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
