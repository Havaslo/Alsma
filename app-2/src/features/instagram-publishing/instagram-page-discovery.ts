import type { Logger } from "pino";

import { MetaGraphRequestError } from "./instagram-graph.client.js";

export { MetaGraphRequestError } from "./instagram-graph.client.js";

type GraphGet = (
  path: string,
  accessToken: string,
  fields?: string,
  parameters?: Record<string, string>,
) => Promise<Record<string, unknown>>;

type InstagramPageCandidate = {
  readonly instagramId: string;
  readonly pageId: string;
  readonly pageToken: string;
};

type DiscoveryReason =
  | "facebook_page_not_visible"
  | "instagram_profile_not_visible"
  | "page_token_not_returned"
  | "instagram_username_mismatch";

type DiscoveryResult =
  | {
      readonly target: InstagramPageCandidate & { readonly username: string };
      readonly source: "direct_page" | "page_list";
    }
  | {
      readonly target: null;
      readonly reason: DiscoveryReason;
      readonly pagesExamined: number;
      readonly pageVisible: boolean;
      readonly instagramVisible: boolean;
      readonly pageTokenVisible: boolean;
    };

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const getInstagramPageCandidate = (
  value: unknown,
): InstagramPageCandidate | null => {
  const page = record(value);
  const instagram = record(page?.instagram_business_account);
  const pageToken = text(page?.access_token);
  const pageId = text(page?.id);
  const instagramId = text(instagram?.id);
  return pageToken && pageId && instagramId
    ? { instagramId, pageId, pageToken }
    : null;
};

export const findTargetInstagram = async (options: {
  readonly graphGet: GraphGet;
  readonly logger: Logger;
  readonly targetPageId?: string;
  readonly targetUsername: string;
  readonly userToken: string;
}): Promise<DiscoveryResult> => {
  let pagesExamined = 0;
  let pageVisible = false;
  let instagramVisible = false;
  let pageTokenVisible = false;
  let usernameMismatch = false;

  const inspectPage = async (
    value: unknown,
  ): Promise<(InstagramPageCandidate & { username: string }) | null> => {
    const page = record(value);
    if (!page || (options.targetPageId && page.id !== options.targetPageId))
      return null;
    pageVisible = true;
    if (text(record(page.instagram_business_account)?.id))
      instagramVisible = true;
    if (text(page.access_token)) pageTokenVisible = true;
    const candidate = getInstagramPageCandidate(page);
    if (!candidate) return null;

    const profile = await options.graphGet(
      encodeURIComponent(candidate.instagramId),
      candidate.pageToken,
      "id,username",
    );
    const username = text(profile.username);
    if (
      profile.id === candidate.instagramId &&
      username?.toLowerCase() === options.targetUsername.toLowerCase()
    )
      return { ...candidate, username };
    usernameMismatch = true;
    return null;
  };

  // Meta documents this direct lookup when the Page ID is known. A business-owned
  // Page can be absent from /me/accounts even though its ID is already known.
  if (options.targetPageId) {
    try {
      const page = await options.graphGet(
        encodeURIComponent(options.targetPageId),
        options.userToken,
        "id,access_token,instagram_business_account{id}",
      );
      const target = await inspectPage(page);
      if (target) return { target, source: "direct_page" };
    } catch (error) {
      if (!(error instanceof MetaGraphRequestError)) throw error;
      options.logger.warn(
        {
          httpStatus: error.httpStatus,
          providerCode: error.providerCode,
          stage: "direct_page_lookup",
        },
        "Instagram direct Page lookup was rejected; trying the Page list",
      );
    }
  }

  let after: string | null = null;
  const seenCursors = new Set<string>();
  for (let index = 0; index < 10; index += 1) {
    const response = await options.graphGet(
      "me/accounts",
      options.userToken,
      "id,access_token,instagram_business_account{id}",
      after ? { after } : undefined,
    );
    if (!Array.isArray(response.data))
      throw new Error("Meta Page list returned an invalid response");
    pagesExamined += response.data.length;
    for (const page of response.data) {
      const target = await inspectPage(page);
      if (target) return { target, source: "page_list" };
    }
    const next = text(record(record(response.paging)?.cursors)?.after);
    if (!next || seenCursors.has(next)) break;
    seenCursors.add(next);
    after = next;
  }

  const reason: DiscoveryReason = !pageVisible
    ? "facebook_page_not_visible"
    : !instagramVisible
      ? "instagram_profile_not_visible"
      : !pageTokenVisible
        ? "page_token_not_returned"
        : usernameMismatch
          ? "instagram_username_mismatch"
          : "instagram_profile_not_visible";
  return {
    target: null,
    reason,
    pagesExamined,
    pageVisible,
    instagramVisible,
    pageTokenVisible,
  };
};
