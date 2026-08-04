import { resolveMediaUrl } from "@/lib/site/media-url";

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
}) => {
  const resolvedSource = resolveMediaUrl(source);
  const resolvedPoster = poster ? resolveMediaUrl(poster) : undefined;

  return isVideoSource(source) ? (
    <video
      aria-label={alt || undefined}
      autoPlay
      className={className}
      loop
      muted
      playsInline
      poster={resolvedPoster}
      src={resolvedSource}
    />
  ) : (
    <img alt={alt} className={className} src={resolvedSource} />
  );
};
