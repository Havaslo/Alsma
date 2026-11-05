import type bridge from "@vkontakte/vk-bridge";

import { apiUrl } from "../lib/api/api-base-url";

type Bridge = typeof bridge;
export async function publishFactoryTest(
  code: string,
  bridge: Bridge,
  stage: (text: string) => void,
) {
  const groupId = 138003065;
  const timeout = async <T>(promise: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), 30000);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  stage("разрешение VK");
  const auth = await timeout(
    bridge.send("VKWebAppGetAuthToken", { app_id: 54873380, scope: "photos" }),
  );
  if (!auth.access_token) throw new Error("VK не предоставил доступ к фото");
  const user = await timeout(bridge.send("VKWebAppGetUserInfo"));
  if (!Number.isSafeInteger(user.id) || user.id <= 0)
    throw new Error("VK не подтвердил пользователя");
  const call = async (
    method: string,
    params: Record<string, string | number>,
  ) => {
    const response = await timeout(
      bridge.send("VKWebAppCallAPIMethod", {
        method,
        params: { ...params, access_token: auth.access_token, v: "5.199" },
      }),
    );
    if (!response.response || (response.response as { error?: unknown }).error)
      throw new Error("VK отклонил запрос");
    return response.response;
  };
  stage("получение адреса загрузки");
  const server = (await call("photos.getWallUploadServer", {
    group_id: groupId,
  })) as { upload_url?: unknown };
  if (typeof server.upload_url !== "string")
    throw new Error("VK не предоставил адрес загрузки");
  stage("загрузка фотографии");
  const uploaded = await fetch(apiUrl("/api/vk-factory-test/upload"), {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, uploadUrl: server.upload_url }),
    signal: AbortSignal.timeout(40000),
    redirect: "error",
  });
  if (!uploaded.ok)
    throw new Error("Не удалось загрузить фото или срок кода истёк");
  const upload = (await uploaded.json()) as {
    server: string | number;
    photo: string;
    hash: string;
  };
  stage("сохранение фотографии");
  const saved = (await call("photos.saveWallPhoto", {
    group_id: groupId,
    server: upload.server,
    photo: upload.photo,
    hash: upload.hash,
  })) as Array<{ owner_id: number; id: number; access_key?: string }>;
  const photo = saved[0];
  if (
    !photo ||
    !Number.isSafeInteger(photo.id) ||
    photo.id <= 0 ||
    ![-groupId, user.id].includes(photo.owner_id) ||
    (photo.access_key !== undefined && !/^[a-zA-Z0-9]+$/.test(photo.access_key))
  )
    throw new Error("VK не подтвердил сохранение фото");
  stage("публикация поста");
  const response = await fetch(apiUrl("/api/vk-factory-test/publish"), {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      userId: user.id,
      photo: {
        ownerId: photo.owner_id,
        id: photo.id,
        ...(photo.access_key ? { accessKey: photo.access_key } : {}),
      },
    }),
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  if (!response.ok) throw new Error("VK не подтвердил публикацию");
  const result = (await response.json()) as { postId?: number };
  if (
    !Number.isSafeInteger(result.postId) ||
    !result.postId ||
    result.postId <= 0
  )
    throw new Error("VK не подтвердил публикацию");
  return result.postId;
}
