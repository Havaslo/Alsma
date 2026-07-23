export type ChatMessageRole = "assistant" | "system" | "user";

export type ChatMessage = {
  readonly content: string;
  readonly createdAt?: Date;
  readonly id: string;
  readonly role: ChatMessageRole;
};

export type ChatSubmitInput = {
  readonly files: readonly File[];
  readonly text: string;
};
