import type bridge from "@vkontakte/vk-bridge";

type VkBridge = typeof bridge;

export type TestPostStage =
  | "разрешение VK"
  | "получение адреса загрузки"
  | "загрузка фотографии"
  | "сохранение фотографии"
  | "публикация поста";

type TestPostOptions = {
  appId: number;
  groupId: number;
  bridge: VkBridge;
  onStage: (stage: TestPostStage) => void;
};

type VkResponse = { error?: unknown };

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), 30_000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function publishTestPost({
  appId,
  groupId,
  bridge,
  onStage,
}: TestPostOptions): Promise<number> {
  onStage("разрешение VK");
  const auth = await withTimeout(
    bridge.send("VKWebAppGetAuthToken", {
      app_id: appId,
      scope: "photos,wall",
    }),
  );
  if (!auth.access_token) throw new Error("VK did not return a token");

  async function call(method: string, params: Record<string, string | number>) {
    const result = await withTimeout(
      bridge.send("VKWebAppCallAPIMethod", {
        method,
        params: { ...params, access_token: auth.access_token, v: "5.199" },
      }),
    );
    const response = result.response as VkResponse | undefined;
    if (response?.error) throw response.error;
    if (response === undefined || response === null)
      throw new Error("VK returned an empty response");
    return result.response;
  }

  onStage("получение адреса загрузки");
  const server = (await call("photos.getWallUploadServer", {
    group_id: groupId,
  })) as { upload_url?: unknown };
  if (typeof server.upload_url !== "string") throw new Error("No upload URL");
  const uploadUrl = new URL(server.upload_url);
  const allowedHosts = ["vk.com", "vk.ru", "userapi.com", "vkuserphoto.ru"];
  if (
    uploadUrl.protocol !== "https:" ||
    !allowedHosts.some(
      (host) =>
        uploadUrl.hostname === host || uploadUrl.hostname.endsWith(`.${host}`),
    )
  )
    throw new Error("Unexpected upload host");

  onStage("загрузка фотографии");
  const photo = await fetch("/src/assets/alsma/spa-river-aerial.jpg", {
    signal: AbortSignal.timeout(30_000),
  });
  if (!photo.ok) throw new Error("Test image unavailable");
  const form = new FormData();
  form.append("photo", await photo.blob(), "test.jpg");
  const uploaded = await fetch(uploadUrl, {
    method: "POST",
    body: form,
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!uploaded.ok) throw new Error("VK upload failed");
  const upload = (await uploaded.json()) as {
    server?: unknown;
    photo?: unknown;
    hash?: unknown;
  };
  if (
    (typeof upload.server !== "number" && typeof upload.server !== "string") ||
    typeof upload.photo !== "string" ||
    upload.photo === "[]" ||
    !upload.photo ||
    typeof upload.hash !== "string" ||
    !upload.hash
  )
    throw new Error("VK upload response was incomplete");

  onStage("сохранение фотографии");
  const saved = (await call("photos.saveWallPhoto", {
    group_id: groupId,
    server: upload.server,
    photo: upload.photo,
    hash: upload.hash,
  })) as unknown;
  const savedPhoto = Array.isArray(saved) ? saved[0] : undefined;
  if (
    !savedPhoto ||
    !Number.isInteger(savedPhoto.owner_id) ||
    savedPhoto.owner_id !== -groupId ||
    !Number.isInteger(savedPhoto.id) ||
    savedPhoto.id <= 0
  )
    throw new Error("VK did not return a photo for the test group");

  onStage("публикация поста");
  const post = (await call("wall.post", {
    owner_id: -groupId,
    from_group: 1,
    message:
      "Тестовая публикация: проверяем подключение VK и загрузку фотографии.",
    attachments: `photo${savedPhoto.owner_id}_${savedPhoto.id}`,
  })) as { post_id?: unknown };
  if (!Number.isInteger(post.post_id) || (post.post_id as number) <= 0)
    throw new Error("VK did not confirm the publication");
  return post.post_id as number;
}
