export const getFactoryMediaDownloadName = (
  title: string,
  contentType: string | undefined,
  src: string,
) => {
  const extensionByType: Record<string, string> = {
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const sourceExtension = src
    .split(/[?#]/u, 1)[0]
    ?.match(/\.([a-z0-9]{2,5})$/iu)?.[1]
    ?.toLowerCase();
  const extension =
    extensionByType[contentType ?? ""] ??
    (sourceExtension &&
    ["jpg", "jpeg", "png", "webp", "gif"].includes(sourceExtension)
      ? sourceExtension
      : "png");
  const safeTitle = title
    .replace(/[\\/:*?"<>|]/gu, "-")
    .replace(/\.[a-z0-9]{2,5}$/iu, "")
    .trim();
  return `${safeTitle || "Изображение"}.${extension}`;
};
