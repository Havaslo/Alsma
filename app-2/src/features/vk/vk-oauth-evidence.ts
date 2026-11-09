import { z } from "zod";

const knownScopes = new Set([
  "photos",
  "offline",
  "wall",
  "groups",
  "email",
  "phone",
  "vkid.personal_info",
  "friends",
  "video",
  "docs",
  "stats",
  "messages",
]);

export const oauthEvidenceSchema = z.object({
  receivedAt: z.string(),
  httpStatus: z.number(),
  grantType: z.enum(["authorization_code", "refresh_token"]),
  expiresIn: z.number().nonnegative().nullable(),
  scopes: z.array(z.string()).nullable(),
  unrecognizedScopeCount: z.number(),
  refreshTokenPresent: z.boolean(),
});

// Persist explicit facts only. Never persist a response, error description,
// code, state, device ID, or token in diagnostics. Missing scope is unknown.
export const oauthEvidence = (
  payload: unknown,
  httpStatus: number,
  grantType: "authorization_code" | "refresh_token",
) => {
  const value =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const scopes =
    typeof value.scope === "string"
      ? [...new Set(value.scope.split(/[ ,]+/).filter(Boolean))]
      : null;
  return {
    receivedAt: new Date().toISOString(),
    httpStatus,
    grantType,
    expiresIn:
      typeof value.expires_in === "number" &&
      Number.isFinite(value.expires_in) &&
      value.expires_in >= 0
        ? value.expires_in
        : null,
    scopes: scopes?.filter((scope) => knownScopes.has(scope)) ?? null,
    unrecognizedScopeCount:
      scopes?.filter((scope) => !knownScopes.has(scope)).length ?? 0,
    refreshTokenPresent:
      typeof value.refresh_token === "string" && value.refresh_token.length > 0,
  };
};
