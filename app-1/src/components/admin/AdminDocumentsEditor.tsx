import { useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { FileText, RefreshCw, Save, Trash2, Upload } from "lucide-react";

import { Loader } from "@/components/ui/Loader";
import {
  ABOUT_DOCUMENTS,
  type AboutDocument,
} from "@/lib/site/about-documents";
import { canonicalMediaUrl, resolveMediaUrl } from "@/lib/site/media-url";
import type { SiteContentItem } from "@/lib/site/site-content-api";
import {
  regenerateSitePdfPreview,
  uploadSiteMedia,
} from "@/lib/site/site-content-api";
import {
  useAdminSiteContent,
  useSaveAdminSiteContent,
} from "@/lib/site/useSiteContent";

type EditableDocument = AboutDocument;

const isDocument = (value: unknown): value is EditableDocument => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.fileName === "string" &&
    typeof item.href === "string" &&
    typeof item.title === "string"
  );
};

const documentTitleFromFileName = (fileName: string) =>
  fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");

const getDocuments = (
  items: SiteContentItem[] | undefined,
): EditableDocument[] => {
  const stored = items?.find((item) => item.itemKey === "documents")?.content
    .items;
  return Array.isArray(stored) && stored.every(isDocument)
    ? stored
    : [...ABOUT_DOCUMENTS];
};

const getManagedObjectToken = (href: string): string | undefined => {
  const path = canonicalMediaUrl(href).split("?", 1)[0];
  const prefix = "/api/media/managed/";
  return path.startsWith(prefix) ? path.slice(prefix.length) : undefined;
};

const DocumentPreview = ({
  document,
}: {
  readonly document: EditableDocument;
}) => (
  <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
    {document.previewHref ? (
      <img
        alt={`Первая страница документа «${document.title}»`}
        className="aspect-[0.707] w-full object-cover object-top"
        src={resolveMediaUrl(document.previewHref)}
      />
    ) : (
      <div className="flex aspect-[0.707] items-center justify-center px-6 text-center text-sm text-muted-ui-foreground">
        Превью появится после обработки файла
      </div>
    )}
  </div>
);

const DocumentsForm = ({
  initialDocuments,
}: {
  readonly initialDocuments: EditableDocument[];
}) => {
  const [documents, setDocuments] =
    useState<EditableDocument[]>(initialDocuments);
  const save = useSaveAdminSiteContent();
  const regeneratePreview = useMutation({
    mutationFn: ({ objectToken }: { objectToken: string; index: number }) =>
      regenerateSitePdfPreview(objectToken),
    onSuccess: (asset, variables) => {
      setDocuments((current) =>
        current.map((item, itemIndex) =>
          itemIndex === variables.index
            ? { ...item, previewHref: asset.previewUrl }
            : item,
        ),
      );
    },
  });
  const upload = useMutation({
    mutationFn: uploadSiteMedia,
    onSuccess: (asset) => {
      setDocuments((current) => [
        ...current,
        {
          fileName: asset.fileName,
          href: asset.url,
          previewHref: asset.previewUrl,
          title: documentTitleFromFileName(asset.fileName),
        },
      ]);
    },
  });

  return (
    <section className="rounded-3xl border border-line bg-brand-foreground p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Документы страницы «О нас»</h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            На сайте показывается первая страница каждого загруженного PDF.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:opacity-90">
          <Upload className="size-4" />
          {upload.isPending ? "Загрузка…" : "Добавить PDF"}
          <input
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>

      {!documents.length ? (
        <div className="grid min-h-56 place-items-center text-center text-sm text-muted-ui-foreground">
          <div>
            <FileText className="mx-auto size-9 text-brand" />
            <p className="mt-3">Документы ещё не добавлены.</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document, index) => (
            <article
              className="rounded-2xl border border-line bg-page p-4"
              key={`${document.href}-${index}`}
            >
              <DocumentPreview document={document} />
              <label className="mt-4 block text-sm font-semibold">
                Название на сайте
                <input
                  className="mt-2 w-full rounded-xl border border-line bg-brand-foreground px-3 py-2.5 font-normal outline-none focus:border-focus"
                  onChange={(event) =>
                    setDocuments((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, title: event.target.value }
                          : item,
                      ),
                    )
                  }
                  value={document.title}
                />
              </label>
              <p
                className="mt-3 truncate text-xs text-muted-ui-foreground"
                title={document.fileName}
              >
                {document.fileName}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <a
                  className="text-sm font-semibold text-brand hover:underline"
                  href={resolveMediaUrl(document.href)}
                  rel="noreferrer"
                  target="_blank"
                >
                  Открыть PDF
                </a>
                {getManagedObjectToken(document.href) && (
                  <button
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline disabled:opacity-60"
                    disabled={regeneratePreview.isPending}
                    onClick={() => {
                      const objectToken = getManagedObjectToken(document.href);
                      if (objectToken) {
                        regeneratePreview.mutate({ objectToken, index });
                      }
                    }}
                    type="button"
                  >
                    <RefreshCw
                      className={`size-4 ${regeneratePreview.isPending ? "animate-spin" : ""}`}
                    />
                    {document.previewHref
                      ? "Обновить превью"
                      : "Создать превью"}
                  </button>
                )}
                <button
                  className="inline-flex items-center gap-1 text-sm font-semibold text-destructive hover:underline"
                  onClick={() =>
                    setDocuments((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  type="button"
                >
                  <Trash2 className="size-4" /> Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-7 flex justify-end border-t border-line pt-5">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground disabled:opacity-60"
          disabled={
            save.isPending || upload.isPending || regeneratePreview.isPending
          }
          onClick={() =>
            save.mutate({
              content: { items: documents },
              itemKey: "documents",
              position: 10,
              section: "about",
              status: "published",
              title: "Документы",
            })
          }
          type="button"
        >
          <Save className="size-4" />
          Сохранить изменения
        </button>
      </div>
    </section>
  );
};

export const AdminDocumentsEditor = () => {
  const content = useAdminSiteContent("about");

  if (content.isLoading)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader className="text-brand" label="Загрузка документов" size="lg" />
      </div>
    );

  const documents = getDocuments(content.data?.items);
  const contentVersion =
    content.data?.items?.find((item) => item.itemKey === "documents")?.id ??
    "defaults";

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold tracking-wide text-muted-ui-foreground uppercase">
          Управление сайтом
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-brand">Документы</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-ui-foreground">
          Здесь модерируются названия и PDF-файлы, которые отображаются в блоке
          «Документы» страницы «О нас».
        </p>
      </section>
      <DocumentsForm initialDocuments={documents} key={contentVersion} />
    </div>
  );
};
