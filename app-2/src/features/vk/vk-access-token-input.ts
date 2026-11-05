// The owner pastes the address VK redirected to; only the token itself is kept.
// Accepting a bare token keeps the same check usable when VK returns one directly.
const tokenPattern = /^\S{20,4096}$/;

export const extractVkAccessToken = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) return null;
  let candidate = value;
  const marker = /(?:^|[#&?])access_token=/.exec(value);
  if (marker) candidate = value.slice(marker.index + marker[0].length);
  // An address without a token in it is not a token, so reject it early.
  else if (value.includes("://")) return null;
  const token = candidate.split(/[&#]/)[0] ?? "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(token);
  } catch {
    return null;
  }
  return tokenPattern.test(decoded) ? decoded : null;
};
