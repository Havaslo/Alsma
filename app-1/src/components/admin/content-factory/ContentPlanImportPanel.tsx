import { useRef, useState } from "react";

import { FileSpreadsheet, LoaderCircle, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import { getChannelLabel } from "@/lib/content-factory/contentFactoryData";
import type {
  ContentPlanPostInput,
  ContentPlanPreview,
} from "@/lib/content-factory/contentFactoryTypes";

const maxFileSizeBytes = 10 * 1_024 * 1_024;

export const ContentPlanImportPanel = ({
  onPreview,
  onGenerate,
}: {
  onPreview: (file: File) => Promise<ContentPlanPreview>;
  onGenerate: (input: {
    fileName: string;
    posts: ContentPlanPostInput[];
  }) => Promise<unknown>;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ContentPlanPreview | null>(null);
  const [error, setError] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectFile = (nextFile?: File) => {
    if (nextFile && nextFile.size > maxFileSizeBytes) {
      setFile(null);
      setPreview(null);
      setError("Размер XLSX-файла не должен превышать 10 МБ.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(nextFile ?? null);
    setPreview(null);
    setError("");
  };

  const previewFile = async () => {
    if (!file) return;
    setIsPreviewing(true);
    setError("");
    try {
      setPreview(await onPreview(file));
    } catch (cause) {
      setError(
        contentFactoryErrorMessage(
          cause,
          "Не удалось прочитать таблицу. Проверьте файл и попробуйте ещё раз.",
        ),
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const generate = async () => {
    if (!preview) return;
    setIsGenerating(true);
    setError("");
    try {
      await onGenerate(preview);
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (cause) {
      setError(
        contentFactoryErrorMessage(
          cause,
          "Не удалось запустить создание постов. Попробуйте ещё раз.",
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-brand uppercase">
            <FileSpreadsheet className="size-4" /> План от SMM-специалиста
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-page-foreground">
            Загрузите таблицу, чтобы подготовить посты
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-ui-foreground">
            Сначала проверим строки. Тексты появятся в календаре только после
            нажатия «Сгенерировать посты» и будут ждать отдельного одобрения.
          </p>
          <p className="mt-1 text-xs text-muted-ui-foreground">
            XLSX до 10 МБ, не более 50 публикаций. Для нескольких площадок
            укажите отдельные строки.
          </p>
        </div>
        <a
          className="text-sm font-semibold text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand"
          download
          href="/content-plan-template.xlsx"
        >
          Скачать шаблон XLSX
        </a>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => selectFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
        <Button
          className="min-h-11 rounded-xl border-line bg-brand-foreground text-page-foreground hover:bg-page"
          onClick={() => inputRef.current?.click()}
          type="button"
          variant="secondary"
        >
          <Upload className="size-4" />
          {file ? "Выбрать другой файл" : "Выбрать XLSX-файл"}
        </Button>
        {file && (
          <span className="min-w-0 truncate text-sm text-muted-ui-foreground">
            {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} МБ
          </span>
        )}
        <Button
          className="min-h-11 rounded-xl bg-brand text-white hover:bg-brand/90 sm:ml-auto"
          disabled={!file || isPreviewing || isGenerating}
          onClick={() => void previewFile()}
          type="button"
        >
          {isPreviewing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4" />
          )}
          Проверить таблицу
        </Button>
      </div>

      {error && (
        <p
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}

      {preview && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-line">
          <div className="flex flex-col gap-3 border-b border-line bg-page/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-page-foreground">
                Найдено публикаций: {preview.posts.length}
              </p>
              <p className="mt-0.5 text-xs text-muted-ui-foreground">
                Время не указано — поставим 12:00. Сейчас ничего не сохранено и
                генерация ещё не запущена.
              </p>
            </div>
            <Button
              className="min-h-10 shrink-0 rounded-xl bg-brand text-white hover:bg-brand/90"
              disabled={isGenerating}
              onClick={() => void generate()}
              type="button"
            >
              {isGenerating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isGenerating ? "Запускаем…" : "Сгенерировать посты"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] divide-y divide-line text-left text-sm">
              <thead className="bg-brand/5 text-xs text-muted-ui-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Дата</th>
                  <th className="px-3 py-2.5 font-semibold">Тип</th>
                  <th className="px-3 py-2.5 font-semibold">Площадка</th>
                  <th className="px-3 py-2.5 font-semibold">Формат</th>
                  <th className="px-3 py-2.5 font-semibold">Тема</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.posts.slice(0, 8).map((post) => (
                  <tr key={`${post.sourceRow}-${post.channel}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-page-foreground">
                      {new Intl.DateTimeFormat("ru-RU").format(
                        new Date(`${post.date}T12:00:00`),
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-ui-foreground">
                      {post.postType}
                    </td>
                    <td className="px-3 py-2.5 text-muted-ui-foreground">
                      {getChannelLabel(post.channel)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-ui-foreground">
                      {post.format}
                    </td>
                    <td className="max-w-64 truncate px-3 py-2.5 text-page-foreground">
                      {post.topic}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.posts.length > 8 && (
              <p className="border-t border-line px-3 py-2 text-xs text-muted-ui-foreground">
                И ещё {preview.posts.length - 8} строк.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
