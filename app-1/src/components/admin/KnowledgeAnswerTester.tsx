import { useForm } from "react-hook-form";

import { MessageCircleQuestion } from "lucide-react";

import { Form } from "@/components/Form";
import { useTestKnowledgeAnswer } from "@/lib/admin/useKnowledgeBase";

export const KnowledgeAnswerTester = () => {
  const test = useTestKnowledgeAnswer();
  const form = useForm({ defaultValues: { question: "" } });

  return (
    <Form
      className="mt-8 rounded-3xl bg-brand p-6 text-brand-foreground"
      form={form}
      onSubmit={({ question }) => test.mutate({ channel: "text", question })}
    >
      <h3 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <MessageCircleQuestion className="size-5" /> Проверка ответа
      </h3>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-3"
          placeholder="Задайте вопрос базе знаний"
          {...form.register("question", { required: true })}
        />
        <button
          className="rounded-full bg-panel px-6 py-3 font-semibold text-brand"
          disabled={test.isPending}
          type="submit"
        >
          Проверить
        </button>
      </div>
      {test.data && (
        <div className="mt-5 rounded-2xl bg-brand-foreground/10 p-5">
          <p>{test.data.answer}</p>
          <p className="mt-3 text-sm text-brand-foreground/60">
            Источников: {test.data.sources.length}
          </p>
        </div>
      )}
    </Form>
  );
};
