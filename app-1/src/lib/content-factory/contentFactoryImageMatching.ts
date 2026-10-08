import type { FactoryMediaItem } from "@/lib/content-factory/contentFactoryData";
import type { ContentFactoryBrief } from "@/lib/content-factory/contentFactoryTypes";

const ignoredWords = new Set([
  "alsma",
  "для",
  "или",
  "как",
  "что",
  "это",
  "пост",
  "публикация",
  "сделай",
  "нужно",
  "хочу",
]);

const tokens = (value: string) =>
  value
    .toLocaleLowerCase("ru-RU")
    .replace(/\.[a-z0-9]{2,5}$/iu, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4 && !ignoredWords.has(word));

export const findMatchingFactoryMedia = (input: {
  mediaItems: FactoryMediaItem[];
  prompt: string;
  brief: ContentFactoryBrief;
  count: number;
}) => {
  const query = [
    input.prompt,
    input.brief.postType,
    input.brief.audience,
    input.brief.keyFacts,
    input.brief.imagePrompt,
  ]
    .filter(Boolean)
    .join(" ");
  const queryWords = [...new Set(tokens(query))];
  const recommendedWords = tokens(input.brief.sourceImageRecommendation);
  if (!input.count || (!queryWords.length && !recommendedWords.length))
    return [];

  return input.mediaItems
    .filter((media) => media.origin !== "generated")
    .map((media) => {
      const metadata = [media.title, media.category, ...media.tags]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru-RU");
      const mediaWords = new Set(tokens(metadata));
      const recommendationMatch =
        recommendedWords.length > 0 &&
        recommendedWords.every((word) => mediaWords.has(word));
      const matchedWords = queryWords.filter((word) => mediaWords.has(word));
      const confidence = recommendationMatch
        ? 100 + matchedWords.length
        : matchedWords.length;
      return { confidence, matchedWords, media };
    })
    .filter(
      ({ confidence, matchedWords }) =>
        confidence >= 100 ||
        matchedWords.length >= 2 ||
        (matchedWords.length === 1 && matchedWords[0]!.length >= 7),
    )
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, input.count)
    .map(({ media }) => media);
};
