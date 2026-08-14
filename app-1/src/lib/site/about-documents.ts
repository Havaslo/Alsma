export type AboutDocument = {
  readonly fileName: string;
  readonly href: string;
  readonly previewHref?: string;
  readonly title: string;
};

export const ABOUT_DOCUMENTS: readonly AboutDocument[] = [
  {
    title: "Медицинская лицензия",
    fileName: "медицинская лицензия.pdf",
    href: "/documents/medical-license.pdf",
    previewHref: "/documents/previews/medical-license.jpg",
  },
  {
    title: "Санитарно-эпидемиологическое заключение",
    fileName: "санитарно-эпидемиологическое заключение.pdf",
    href: "/documents/sanitary-conclusion.pdf",
    previewHref: "/documents/previews/sanitary-conclusion.jpg",
  },
  {
    title: "Папка гостя",
    fileName: "Алсма папка гостя.pdf",
    href: "/documents/guest-folder.pdf",
    previewHref: "/documents/previews/guest-folder.jpg",
  },
];
