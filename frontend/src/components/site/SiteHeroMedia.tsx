const videoExtensions = [".mp4", ".webm"] as const;

const isVideoSource = (source: string) => {
  const normalized = source.toLowerCase();
  if (videoExtensions.some((extension) => normalized.includes(extension)))
    return true;

  try {
    return new URL(source, window.location.origin).searchParams
      .get("contentType")
      ?.startsWith("video/");
  } catch {
    return false;
  }
};

export const SiteHeroMedia = ({
  alt = "",
  className,
  poster,
  source,
}: {
  readonly alt?: string;
  readonly className: string;
  readonly poster?: string;
  readonly source: string;
}) =>
  isVideoSource(source) ? (
    <video
      aria-label={alt || undefined}
      autoPlay
      className={className}
      loop
      muted
      playsInline
      poster={poster || undefined}
      src={source}
    />
  ) : (
    <img alt={alt} className={className} src={source} />
  );
