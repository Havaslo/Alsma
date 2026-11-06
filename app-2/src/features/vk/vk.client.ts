import type { Logger } from "pino";

const apiBaseUrl = "https://api.vk.com/method";
const apiVersion = "5.199";
const retryDelays = [250, 750] as const;
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class VkApiError extends Error {
  readonly code: number;
  readonly subcode?: number;
  method?: string;
  uploadTransport?: {
    originalHost: string;
    host: string;
    path: string;
    originalStatus: number;
    status: number;
  };
  invalidParameters?: string[];
  uploadDiagnostic?: {
    photoLength: number;
    photoEmpty: boolean;
    hashPresent: boolean;
    serverPresent: boolean;
  };
  constructor(code: number, message: string, subcode?: number) {
    super(message);
    this.name = "VkApiError";
    this.code = code;
    this.subcode = subcode;
  }
}
export class VkPostVerificationError extends Error {
  readonly name = "VkPostVerificationError";
  constructor(readonly url: string) {
    super("VK created a post but did not confirm its photos");
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
  getPhotoUploadAccessToken,
  logger,
  singleAttempt = false,
  validatePhotoUploadUrl,
}: {
  readonly accessToken?: string;
  readonly photoUploadAccessToken?: string;
  readonly getPhotoUploadAccessToken?: () => Promise<string | undefined>;
  readonly logger: Logger;
  readonly singleAttempt?: boolean;
  readonly validatePhotoUploadUrl?: (url: string) => boolean;
}) => {
  const token = accessToken?.trim();
  const photoToken = photoUploadAccessToken?.trim();
  const requestWithToken = async (
    method: string,
    parameters: Record<string, string>,
    authToken: string | undefined,
  ) => {
    if (!authToken) throw new Error("VK access token is not configured");
    const maxAttempts = singleAttempt ? 0 : retryDelays.length;
    for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
      const query = new URLSearchParams({
        ...parameters,
        access_token: authToken,
        v: apiVersion,
      });
      try {
        const response = await fetch(
          singleAttempt
            ? `${apiBaseUrl}/${method}`
            : `${apiBaseUrl}/${method}?${query}`,
          singleAttempt
            ? {
                method: "POST",
                body: query,
                redirect: "error",
                signal: AbortSignal.timeout(15_000),
              }
            : { signal: AbortSignal.timeout(15_000) },
        );
        const payload = (await response.json().catch(() => null)) as {
          response?: unknown;
          error?: {
            error_code?: number;
            error_subcode?: number;
            error_msg?: string;
          };
        } | null;
        if (response.ok && payload?.response !== undefined)
          return payload.response;
        const error = new VkApiError(
          payload?.error?.error_code ?? response.status,
          payload?.error?.error_msg ?? "VK API request failed",
          payload?.error?.error_subcode,
        );
        error.method = method;
        if (error.code === 100)
          error.invalidParameters = Object.keys(parameters).filter((name) =>
            new RegExp(`\\b${name}\\b`, "i").test(error.message),
          );
        if (!shouldRetry(error.code) || attempt === maxAttempts) throw error;
      } catch (error) {
        if (error instanceof VkApiError) throw error;
        if (attempt === maxAttempts) throw error;
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
      const uploadToken = getPhotoUploadAccessToken
        ? await getPhotoUploadAccessToken()
        : photoToken;
      return await requestWithToken(method, parameters, uploadToken ?? token);
    } catch (error) {
      if (error instanceof VkApiError && [5, 15, 27].includes(error.code))
        throw new VkApiError(
          error.code,
          `VK photo upload access was denied: ${error.message}`,
          error.subcode,
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
      if ((photoToken || getPhotoUploadAccessToken) && groupId) {
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
    inspectPhotoGroupRole: async (groupId: string) => {
      const users = (await requestPhotoUpload("users.get", {})) as Array<{
        id?: number;
      }>;
      const userId =
        Array.isArray(users) && typeof users[0]?.id === "number"
          ? users[0].id
          : null;
      const result = await requestPhotoUpload("groups.getById", {
        group_ids: groupId,
        fields: "is_admin,admin_level,is_member",
      });
      const groups = Array.isArray(result)
        ? result
        : (result as { groups?: unknown[] })?.groups;
      const group = groups?.find(
        (item) => String((item as { id?: unknown }).id) === groupId,
      ) as
        | { is_admin?: number; admin_level?: number; is_member?: number }
        | undefined;
      return {
        userId,
        groupFound: Boolean(group),
        isAdmin:
          typeof group?.is_admin === "number" ? group.is_admin === 1 : null,
        adminLevel: group?.admin_level ?? null,
        isMember:
          typeof group?.is_member === "number" ? group.is_member === 1 : null,
      };
    },
    verifyWallPhotoUpload: async (groupId: string) => {
      const upload = (await requestPhotoUpload("photos.getWallUploadServer", {
        group_id: groupId,
      })) as { upload_url?: unknown };
      if (
        typeof upload?.upload_url !== "string" ||
        !upload.upload_url ||
        (validatePhotoUploadUrl && !validatePhotoUploadUrl(upload.upload_url))
      )
        throw new Error("VK photo upload URL is missing or invalid");
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
      readonly prepareOnly?: boolean;
      readonly images: readonly VkPublishImage[];
      readonly text: string;
    }) => {
      const groupId = input.groupId.trim();
      if (!/^\d+$/u.test(groupId)) throw new Error("VK group ID is invalid");
      if (!input.text.trim()) throw new Error("VK post text is empty");
      if (input.images.length > 10)
        throw new Error("VK post has too many images");

      const photoAttachments: string[] = [];
      const preparedPhotos: Array<{
        ownerId: string;
        id: string;
        hasAccessKey: boolean;
        sizes: number;
        albumId: unknown;
      }> = [];
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
        if (
          typeof upload.upload_url !== "string" ||
          (validatePhotoUploadUrl && !validatePhotoUploadUrl(upload.upload_url))
        )
          throw new Error("VK photo upload URL is invalid");

        const form = new FormData();
        const bytes = new ArrayBuffer(image.content.byteLength);
        new Uint8Array(bytes).set(image.content);
        form.append(
          "photo",
          new Blob([bytes], { type: image.contentType }),
          image.fileName,
        );
        // Diagnostic preparation tests a fully buffered multipart body with
        // the final CRLF expected by some legacy multipart parsers.
        let body: BodyInit = form;
        let headers: Record<string, string> | undefined;
        if (input.prepareOnly) {
          const encoded = new Request("https://localhost/", {
            method: "POST",
            body: form,
          });
          const serialized = Buffer.from(await encoded.arrayBuffer());
          body = new Uint8Array(
            serialized.subarray(-2).toString() === "\r\n"
              ? serialized
              : Buffer.concat([serialized, Buffer.from("\r\n")]),
          );
          headers = {
            "Content-Type": encoded.headers.get("content-type")!,
            "Content-Length": String(body.byteLength),
          };
        }
        const uploadPhoto = (url: string) =>
          fetch(url, {
            body,
            headers,
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(30_000),
          });
        let uploadedResponse = await uploadPhoto(upload.upload_url);
        const uploadAddress = new URL(upload.upload_url);
        const originalHost = uploadAddress.hostname;
        const originalStatus = uploadedResponse.status;
        // Some VK-issued .com upload endpoints reject multipart POST with 405.
        // Retry only the same capability on VK's .ru upload host, never wall.post.
        if (
          uploadedResponse.status === 405 &&
          uploadAddress.protocol === "https:" &&
          uploadAddress.hostname === "pu.vk.com" &&
          !uploadAddress.port &&
          !uploadAddress.username &&
          !uploadAddress.password &&
          /^\/c\d+\/ss\d+\/upload\.php$/.test(uploadAddress.pathname)
        ) {
          uploadAddress.hostname = "pu.vk.ru";
          if (
            !validatePhotoUploadUrl ||
            validatePhotoUploadUrl(uploadAddress.toString())
          ) {
            await uploadedResponse.body?.cancel();
            uploadedResponse = await uploadPhoto(uploadAddress.toString());
          }
        }
        const uploadTransport = {
          originalHost,
          host: uploadAddress.hostname,
          path: uploadAddress.pathname,
          originalStatus,
          status: uploadedResponse.status,
        };
        if (!uploadedResponse.ok) {
          const error = new VkApiError(
            uploadedResponse.status,
            "VK photo upload failed",
          );
          error.method = "photos.upload";
          error.uploadTransport = uploadTransport;
          throw error;
        }
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

        const uploadDiagnostic = {
          photoLength: uploaded.photo.length,
          photoEmpty: uploaded.photo.trim() === "[]" || !uploaded.photo.trim(),
          hashPresent: Boolean(uploaded.hash),
          serverPresent: Boolean(uploaded.server),
        };
        if (uploadDiagnostic.photoEmpty) {
          const error = new VkApiError(
            122,
            "VK photo upload returned no photo",
          );
          error.method = "photos.upload";
          error.uploadDiagnostic = uploadDiagnostic;
          error.uploadTransport = uploadTransport;
          throw error;
        }
        const saved = (await requestPhotoUpload("photos.saveWallPhoto", {
          group_id: groupId,
          hash: uploaded.hash,
          photo: uploaded.photo,
          server: String(uploaded.server),
        }).catch((error) => {
          if (error instanceof VkApiError)
            error.uploadDiagnostic = uploadDiagnostic;
          throw error;
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
        preparedPhotos.push({
          ownerId: String(ownerId),
          id: String(photoId),
          hasAccessKey: Boolean(accessKey),
          sizes: Array.isArray(photo?.sizes) ? photo.sizes.length : 0,
          albumId: typeof photo?.album_id === "number" ? photo.album_id : null,
        });
      }

      if (input.prepareOnly)
        return { externalId: "", url: "", attachedImages: 0, preparedPhotos };
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
      const postUrl = `https://vk.com/wall-${groupId}_${postId}`;
      if (photoAttachments.length) {
        try {
          const result = await request("wall.getById", {
            posts: `-${groupId}_${postId}`,
          });
          const posts = Array.isArray(result)
            ? result
            : (result as { items?: unknown[] })?.items;
          const post = posts?.find(
            (item) =>
              String((item as { id?: unknown }).id) === postId &&
              String((item as { owner_id?: unknown }).owner_id) ===
                `-${groupId}`,
          ) as
            | {
                attachments?: Array<{
                  type?: string;
                  photo?: { id?: unknown };
                }>;
              }
            | undefined;
          const photos =
            post?.attachments?.filter(
              (item) => item.type === "photo" && item.photo?.id != null,
            ) ?? [];
          if (photos.length < photoAttachments.length)
            throw new VkPostVerificationError(postUrl);
        } catch {
          throw new VkPostVerificationError(postUrl);
        }
      }

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
