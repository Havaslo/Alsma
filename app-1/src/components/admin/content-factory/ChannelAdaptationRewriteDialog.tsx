import { type FormEvent, useState } from "react";

import { LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export const ChannelAdaptationRewriteDialog = ({
  channelLabel,
  onClose,
  onSubmit,
  open,
}: {
  channelLabel: string;
  onClose: () => void;
  onSubmit: (instruction: string) => Promise<boolean>;
  open: boolean;
}) => {
  const [instruction, setInstruction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedInstruction = instruction.trim();
    if (!trimmedInstruction || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (await onSubmit(trimmedInstruction)) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      className="max-w-xl"
      closeLabel="Закрыть"
      footer={
        <>
          <Button
            className="min-h-10"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Отмена
          </Button>
          <Button
            className="min-h-10"
            disabled={!instruction.trim() || isSubmitting}
            form="channel-adaptation-rewrite-form"
            type="submit"
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isSubmitting ? "Перерабатываем…" : "Переработать текст"}
          </Button>
        </>
      }
      onClose={isSubmitting ? () => undefined : onClose}
      open={open}
      title={`Переработать версию для ${channelLabel}`}
    >
      <form
        className="space-y-3"
        id="channel-adaptation-rewrite-form"
        onSubmit={(event) => void submit(event)}
      >
        <p className="text-sm leading-6 text-muted-ui-foreground">
          Опишите, что изменить. Агент перепишет только текст этого канала;
          остальные версии останутся без изменений.
        </p>
        <label
          className="block text-sm font-semibold text-page-foreground"
          htmlFor="channel-adaptation-rewrite-instruction"
        >
          Инструкция для агента
        </label>
        <textarea
          autoFocus
          className="min-h-36 w-full resize-y rounded-xl border border-line bg-brand-foreground px-3.5 py-3 text-sm leading-6 text-page-foreground outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:ring-4 focus:ring-focus/10 disabled:opacity-60"
          disabled={isSubmitting}
          id="channel-adaptation-rewrite-instruction"
          maxLength={2_000}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="Например: начни с короткого вопроса, сохрани спокойный тон и добавь призыв проверить свободные даты."
          required
          value={instruction}
        />
      </form>
    </Modal>
  );
};
