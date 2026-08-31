const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const safePersonName = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const name = value.trim().replace(/\s+/gu, " ");
  return /^[а-яё-]{2,40}(?:\s+[а-яё-]{2,40})?$/iu.test(name) ? name : undefined;
};

export const trustedName = (
  extracted: Record<string, unknown>,
  transcript: unknown,
) => {
  if (Array.isArray(transcript))
    for (const item of transcript) {
      const segment = asObject(item);
      if (segment.role !== "guest") continue;
      const match = String(segment.text ?? "").match(
        /(?:меня\s+зовут|это\s+я|я\s*[—-])\s*([а-яё-]{2,40}(?:\s+[а-яё-]{2,40})?)/iu,
      );
      const name = safePersonName(match?.[1]);
      if (name) return name;
    }
  return Number(extracted.nameConfidence) >= 0.85
    ? safePersonName(extracted.name)
    : undefined;
};

export const canReplaceName = (value: string | null) =>
  !value || /^(гость|клиент|неизвестн(?:ый|ая))$/iu.test(value.trim());
