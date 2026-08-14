export type AboutDocument = {
  readonly fileName: string;
  readonly href: string;
  readonly title: string;
};

export const ABOUT_DOCUMENTS: readonly AboutDocument[] = [
  {
    title: "Медицинская лицензия",
    fileName: "медицинская лицензия.pdf",
    href: "/documents/medical-license.pdf",
  },
  {
    title: "Санитарно-эпидемиологическое заключение",
    fileName: "санитарно-эпидемиологическое заключение.pdf",
    href: "/documents/sanitary-conclusion.pdf",
  },
  {
    title: "Папка гостя",
    fileName: "Алсма папка гостя.pdf",
    href: "/documents/guest-folder.pdf",
  },
];
