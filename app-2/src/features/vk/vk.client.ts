import type { Logger } from "pino";

const apiBaseUrl = "https://api.vk.com/method";
const apiVersion = "5.199";
const retryDelays = [250, 750] as const;
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class VkApiError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "VkApiError";
    this.code = code;
  }
}
const shouldRetry = (code: number) => code === 6 || code === 10 || code === 29;
const randomIdFor = (value: string) => {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return String(((hash >>> 0) % 2_147_483_646) + 1);
};
export type VkHistoryMessage = {
  readonly id: string;
  readonly fromId: string;
  readonly peerId: string;
  readonly text: string;
  readonly date: number;
};

export type VkPublishImage = {
  readonly content: Uint8Array;
  readonly contentType: string;
  readonly fileName: string;
};

export type VkPublishingAccess = {
  readonly tokenKind: "user" | "community" | "unknown";
  readonly permissions: readonly string[];
  readonly canPublish: boolean;
  readonly canAttachPhotos: boolean;
  readonly missing: readonly string[];
  readonly probe: "ok" | "denied" | "unavailable";
};

const permissionNames = (value: unknown): string[] => {
  const source = Array.isArray(value)
    ? value
    : (value as { permissions?: unknown } | null)?.permissions;
  if (!Array.isArray(source)) return [];
  const names: string[] = [];
  for (const permission of source) {
    if (typeof permission === "string") names.push(permission);
    else {
      const name = (permission as { name?: unknown } | null)?.name;
      if (typeof name === "string") names.push(name);
    }
  }
  return names;
};

const isGroupAuthPhotoDenial = (error: unknown) =>
  error instanceof VkApiError &&
  /unavailable with group auth/iu.test(error.message);

export const createVkClient = ({
  accessToken,
  photoUploadAccessToken,
  logger,
}: {
  readonly accessToken?: string;
  readonly photoUploadAccessToken?: string;
  readonly logger: Logger;
}) => {
  const token = accessToken?.trim();
  const photoToken = photoUploadAccessToken?.trim();
  const requestWithToken = async (
    method: string,
    parameters: Record<string, string>,
    authToken: string | undefined,
  ) => {
    if (!authToken) throw new Error("VK access token is not configured");
    for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
      const query = new URLSearchParams({
        ...parameters,
        access_token: authToken,
        v: apiVersion,
      });
      try {
        const response = await fetch(`${apiBaseUrl}/${method}?${query}`, {
          signal: AbortSignal.timeout(15_000),
        });
        const payload = (await response.json().catch(() => null)) as {
          response?: unknown;
          error?: { error_code?: number; error_msg?: string };
        } | null;
        if (response.ok && payload?.response !== undefined)
          return payload.response;
        const error = new VkApiError(
          payload?.error?.error_code ?? response.status,
          payload?.error?.error_msg ?? "VK API request failed",
        );
        if (!shouldRetry(error.code) || attempt === retryDelays.length)
          throw error;
      } catch (error) {
        if (error instanceof VkApiError) throw error;
        if (attempt === retryDelays.length) throw error;
      }
      await wait(retryDelays[attempt]!);
    }
    throw new Error("VK API request failed");
  };
  const request = (method: string, parameters: Record<string, string>) =>
    requestWithToken(method, parameters, token);
  const requestPhotoUpload = async (
    method: string,
    parameters: Record<string, string>,
  ) => {
    try {
      return await requestWithToken(method, parameters, photoToken ?? token);
    } catch (error) {
      if (error instanceof VkApiError && [5, 15, 27].includes(error.code))
        throw new VkApiError(
          error.code,
          `VK photo upload access was denied: ${error.message}`,
        );
      throw error;
    }
  };
  const inspectPublishingAccess = async (
    groupId?: string,
  ): Promise<VkPublishingAccess> => {
    let tokenKind: VkPublishingAccess["tokenKind"] = "unknown";
    let permissions: string[] = [];
    let scopeMissing: string[] = [];
    try {
      const mask = Number(await request("account.getAppPermissions", {}));
      if (Number.isFinite(mask)) {
        tokenKind = "user";
        scopeMissing = [
          ...((mask & 8_192) === 0 ? ["wall"] : []),
          ...((mask & 1_073_741_824) === 0 ? ["manage"] : []),
        ];
      }
    } catch {
      // account.getAppPermissions is unavailable for community tokens.
    }
    if (tokenKind === "unknown") {
      try {
        permissions = permissionNames(
          await request("groups.getTokenPermissions", {}),
        );
        tokenKind = "community";
      } catch {
        tokenKind = "unknown";
      }
    }
    if (tokenKind === "community") {
      // A community key remains the authority for wall posts and bot messages.
      // VK rejects photo-upload methods with group auth, so use the separate
      // user token only to check whether this server can attach wall photos.
      const missing =
        permissions.length > 0 && !permissions.includes("wall") ? ["wall"] : [];
      let canAttachPhotos = false;
      if (photoToken && groupId) {
        try {
          const upload = (await requestPhotoUpload(
            "photos.getWallUploadServer",
            { group_id: groupId },
          )) as { upload_url?: unknown };
          canAttachPhotos = typeof upload.upload_url === "string";
        } catch (error) {
          logger.warn(
            {
              vkCode: error instanceof VkApiError ? error.code : null,
              vkCommunityId: groupId,
            },
            "VK user photo-upload access probe failed",
          );
        }
      }
      return {
        tokenKind,
        permissions,
        canPublish: missing.length === 0,
        canAttachPhotos,
        missing,
        probe: permissions.length > 0 ? "ok" : "unavailable",
      };
    }
    if (tokenKind === "user" && groupId) {
      try {
        // This prepares a wall photo upload but does not upload or publish
        // anything. It proves that the token can actually attach a photo to a
        // community post, which is the operation the content factory needs.
        await requestPhotoUpload("photos.getWallUploadServer", {
          group_id: groupId,
        });
        return {
          tokenKind,
          permissions,
          canPublish: true,
          canAttachPhotos: true,
          missing: [],
          probe: "ok",
        };
      } catch (error) {
        if (
          error instanceof VkApiError &&
          (error.code === 5 || error.code === 15 || error.code === 27)
        ) {
          logger.warn(
            {
              vkCode: error.code,
              vkCommunityId: groupId,
              vkProbeMessage: error.message,
            },
            "VK photo upload probe denied",
          );
          return {
            tokenKind,
            permissions,
            canPublish: false,
            canAttachPhotos: false,
            missing: scopeMissing.length > 0 ? scopeMissing : ["wall/photos"],
            probe: "denied",
          };
        }
        return {
          tokenKind,
          permissions,
          canPublish: scopeMissing.length === 0,
          canAttachPhotos: false,
          missing: scopeMissing,
          probe: "unavailable",
        };
      }
    }
    if (tokenKind === "user")
      return {
        tokenKind,
        permissions,
        canPublish: scopeMissing.length === 0,
        canAttachPhotos: false,
        missing: scopeMissing,
        probe: "unavailable",
      };
    return {
      tokenKind: "unknown",
      permissions,
      canPublish: false,
      canAttachPhotos: false,
      missing: [],
      probe: "unavailable",
    };
  };
  return {
    configured: Boolean(token),
    verifyCredentials: async (groupId: string) => {
      await request("groups.getById", { group_id: groupId });
    },
    inspectPublishingAccess,
    verifyWallPhotoUpload: async (groupId: string) => {
      const upload = (await requestPhotoUpload("photos.getWallUploadServer", {
        group_id: groupId,
      })) as { upload_url?: unknown };
      if (typeof upload?.upload_url !== "string" || !upload.upload_url)
        throw new Error("VK photo upload URL is missing");
    },
    verifyPublishingRights: async (groupId: string) => {
      const access = await inspectPublishingAccess(groupId);
      if (access.canPublish) return;
      if (access.probe === "unavailable" && access.tokenKind === "unknown") {
        // The actual publish still reports VK's provider error; avoid a false
        // block at scheduling time when permission inspection is unavailable.
        logger.warn("VK publishing access could not be inspected");
        return;
      }
      logger.warn(
        {
          vkTokenKind: access.tokenKind,
          vkMissingPermissions: access.missing,
          vkCommunityPermissions: access.permissions,
        },
        "VK token cannot publish to a community",
      );
      throw new VkApiError(
        27,
        access.tokenKind === "community"
          ? `Group authorization failed: the community token lacks ${access.missing.join(", ")} permission`
          : `Group authorization failed: the token lacks ${access.missing.join(" or ")} scope`,
      );
    },
    getHistory: async (
      peerId: string,
      full = false,
    ): Promise<VkHistoryMessage[]> => {
      const history: VkHistoryMessage[] = [];
      const maxMessages = full ? 2_000 : 200;
      for (let offset = 0; offset < maxMessages; offset += 200) {
        const result = (await request("messages.getHistory", {
          peer_id: peerId,
          count: "200",
          offset: String(offset),
        })) as { items?: Array<Record<string, unknown>> };
        const page = (result.items ?? [])
          .map((item) => ({
            id: String(item.id ?? ""),
            fromId: String(item.from_id ?? ""),
            peerId: String(item.peer_id ?? peerId),
            text: typeof item.text === "string" ? item.text.trim() : "",
            date: Number(item.date ?? 0),
          }))
          .filter((item) => item.id && item.text && item.date);
        history.push(...page);
        if (page.length < 200 || !full) break;
      }
      return history.sort((left, right) => left.date - right.date);
    },
    sendMessage: async (userId: string, text: string, randomId: string) => {
      const result = await request("messages.send", {
        peer_id: userId,
        random_id: randomIdFor(randomId),
        message: text.slice(0, 4_096),
      });
      return String(result);
    },
    publishWallPost: async (input: {
      readonly groupId: string;
      readonly idempotencyKey: string;
      readonly images: readonly VkPublishImage[];
      readonly text: string;
    }) => {
      const groupId = input.groupId.trim();
      if (!/^\d+$/u.test(groupId)) throw new Error("VK group ID is invalid");
      if (!input.text.trim()) throw new Error("VK post text is empty");
      if (input.images.length > 10)
        throw new Error("VK post has too many images");

      const photoAttachments: string[] = [];
      for (const image of input.images) {
        let upload: { upload_url?: unknown };
        try {
          upload = (await requestPhotoUpload("photos.getWallUploadServer", {
            group_id: groupId,
          })) as { upload_url?: unknown };
        } catch (error) {
          if (isGroupAuthPhotoDenial(error))
            throw new VkApiError(
              27,
              "VK photo upload requires a user access token; community authorization cannot upload wall photos",
            );
          throw error;
        }
        if (typeof upload.upload_url !== "string")
          throw new Error("VK photo upload URL is missing");

        const form = new FormData();
        const bytes = new ArrayBuffer(image.content.byteLength);
        new Uint8Array(bytes).set(image.content);
        form.append(
          "photo",
          new Blob([bytes], { type: image.contentType }),
          image.fileName,
        );
        const uploadedResponse = await fetch(upload.upload_url, {
          body: form,
          method: "POST",
          signal: AbortSignal.timeout(30_000),
        });
        if (!uploadedResponse.ok)
          throw new VkApiError(
            uploadedResponse.status,
            "VK photo upload failed",
          );
        const uploaded = (await uploadedResponse.json().catch(() => null)) as {
          hash?: unknown;
          photo?: unknown;
          server?: unknown;
        } | null;
        if (
          !uploaded ||
          typeof uploaded.hash !== "string" ||
          typeof uploaded.photo !== "string" ||
          (typeof uploaded.server !== "number" &&
            typeof uploaded.server !== "string")
        )
          throw new Error("VK photo upload returned an invalid response");

        const saved = (await requestPhotoUpload("photos.saveWallPhoto", {
          group_id: groupId,
          hash: uploaded.hash,
          photo: uploaded.photo,
          server: String(uploaded.server),
        })) as Array<Record<string, unknown>>;
        const photo = Array.isArray(saved) ? saved[0] : undefined;
        const ownerId = photo?.owner_id;
        const photoId = photo?.id;
        if (
          (typeof ownerId !== "number" && typeof ownerId !== "string") ||
          (typeof photoId !== "number" && typeof photoId !== "string")
        )
          throw new Error("VK did not return a saved photo ID");
        const accessKey =
          typeof photo?.access_key === "string" ? `_${photo.access_key}` : "";
        photoAttachments.push(`photo${ownerId}_${photoId}${accessKey}`);
      }

      const response = (await request("wall.post", {
        owner_id: `-${groupId}`,
        from_group: "1",
        message: input.text.trim(),
        ...(photoAttachments.length
          ? { attachments: photoAttachments.join(",") }
          : {}),
        guid: input.idempotencyKey,
      })) as { post_id?: unknown };
      if (
        typeof response.post_id !== "number" &&
        typeof response.post_id !== "string"
      )
        throw new Error("VK did not return a post ID");
      const postId = String(response.post_id);
      return {
        externalId: postId,
        url: `https://vk.com/wall-${groupId}_${postId}`,
        attachedImages: photoAttachments.length,
      };
    },
    logConfigurationError: () => logger.warn("VK API client is not configured"),
  };
};
export type VkClient = ReturnType<typeof createVkClient>;
