import { type ChangeEvent, type KeyboardEvent, useRef, useState } from "react";

import { Paperclip, Send, X } from "lucide-react";

import type { ChatSubmitInput } from "@/components/chat/chat-types";
import { Loader } from "@/components/ui/Loader";
import { Textarea } from "@/components/ui/Textarea";

export type ChatComposerProps = {
  readonly disabled?: boolean;
  readonly isSending?: boolean;
  readonly onSubmit: (input: ChatSubmitInput) => Promise<void> | void;
  readonly placeholder?: string;
};

export const ChatComposer = ({
  disabled = false,
  isSending = false,
  onSubmit,
  placeholder = "Message the assistant",
}: ChatComposerProps) => {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSubmit =
    !disabled && !isSending && Boolean(text.trim() || files.length);

  const submit = async () => {
    if (!canSubmit) return;
    const input = { files, text: text.trim() };
    setText("");
    setFiles([]);
    await onSubmit(input);
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles((current) => [...current, ...nextFiles]);
    event.target.value = "";
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void submit();
  };

  return (
    <div className="border-t border-line/60 bg-panel/85 p-3 sm:p-4">
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-line/70 bg-muted-ui/60 px-3 py-1 text-xs"
              key={`${file.name}-${file.size}-${index}`}
            >
              <span className="truncate">{file.name}</span>
              <button
                aria-label={`Remove ${file.name}`}
                className="text-muted-ui-foreground hover:text-panel-foreground"
                onClick={() =>
                  setFiles((current) =>
                    current.filter((_, fileIndex) => fileIndex !== index),
                  )
                }
                type="button"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-line/70 bg-page/70 p-2 shadow-sm shadow-page-foreground/5 transition focus-within:border-focus focus-within:ring-4 focus-within:ring-focus/10">
        <input
          className="sr-only"
          multiple
          onChange={addFiles}
          ref={fileInputRef}
          type="file"
        />
        <button
          aria-label="Attach files"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-ui-foreground transition hover:bg-muted-ui hover:text-page-foreground focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none"
          disabled={disabled || isSending}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Paperclip aria-hidden="true" className="size-4" />
        </button>
        <Textarea
          aria-label="Chat message"
          className="min-h-10 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus:ring-0"
          disabled={disabled || isSending}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          value={text}
        />
        <button
          aria-label="Send message"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm shadow-brand/20 transition hover:bg-brand/90 focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          disabled={!canSubmit}
          onClick={() => void submit()}
          type="button"
        >
          {isSending ? (
            <Loader label="Sending" size="sm" />
          ) : (
            <Send aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-ui-foreground">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
};
