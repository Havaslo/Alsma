import bridge from "@vkontakte/vk-bridge";

const APP_ID = 54873380;
const TEST_GROUP_ID = 138003065;
const TRUSTED_VK_HOSTS = new Set(["vk.com", "vk.ru", "m.vk.com", "m.vk.ru"]);

const button = document.querySelector<HTMLButtonElement>("#check");
const status = document.querySelector<HTMLElement>("#status");
if (!button || !status) throw new Error("VK probe page is incomplete");

function setStatus(message: string) {
  if (status) status.textContent = message;
}

function isTrustedVkFrame(): boolean {
  if (window.parent === window) return false;
  try {
    const referrer = new URL(document.referrer);
    const launchAppId = new URLSearchParams(location.search).get("vk_app_id");
    return (
      referrer.protocol === "https:" &&
      TRUSTED_VK_HOSTS.has(referrer.hostname) &&
      launchAppId === String(APP_ID)
    );
  } catch {
    return false;
  }
}

function errorCode(error: unknown, depth = 0): number | null {
  if (depth > 3) return null;
  if (!error || typeof error !== "object") return null;
  const object = error as Record<string, unknown>;
  const code = object.error_code;
  if (
    typeof code === "number" &&
    Number.isInteger(code) &&
    code >= 0 &&
    code < 100000
  )
    return code;
  return (
    errorCode(object.error_data, depth + 1) ??
    errorCode(object.error, depth + 1)
  );
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
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
}

async function checkAccess() {
  if (!button || !isTrustedVkFrame()) return;
  button.disabled = true;
  let stage = "разрешение на фотографии";
  try {
    setStatus("Подтвердите доступ к фотографиям в окне VK.");
    const authorization = await withTimeout(
      bridge.send("VKWebAppGetAuthToken", { app_id: APP_ID, scope: "photos" }),
    );
    if (!authorization.access_token) {
      setStatus("VK не вернул ключ доступа. Публикаций не было.");
      return;
    }
    stage = "запрос адреса загрузки";
    setStatus("Проверяем доступ для тестовой группы…");
    const result = await withTimeout(
      bridge.send("VKWebAppCallAPIMethod", {
        method: "photos.getWallUploadServer",
        params: {
          access_token: authorization.access_token,
          v: "5.199",
          group_id: TEST_GROUP_ID,
        },
      }),
    );
    const response = result.response as
      { upload_url?: unknown; error?: unknown } | undefined;
    if (
      typeof response?.upload_url === "string" &&
      response.upload_url.length > 0
    ) {
      setStatus(
        "VK вернул адрес загрузки для тестовой группы. Это подтверждает первый этап, но не загрузку или публикацию фото. Пришлите скрин этого результата.",
      );
    } else {
      const code = errorCode(response?.error);
      setStatus(
        `Доступ к адресу загрузки не подтверждён${code === null ? "" : `; код VK: ${code}`}. Пришлите скрин этого результата.`,
      );
    }
  } catch (error) {
    const code = errorCode(error);
    setStatus(
      `Проверка остановилась на этапе «${stage}»${code === null ? "" : `; код VK: ${code}`}. Пришлите скрин этого результата. Постов не было.`,
    );
  } finally {
    button.disabled = false;
  }
}

async function initialize() {
  if (!import.meta.env.DEV) {
    setStatus("Проверка доступна только в предпросмотре.");
    return;
  }
  if (window.parent === window) {
    setStatus(
      "Откройте мини-приложение внутри VK с аккаунта администратора. С этой страницы напрямую проверку запускать нельзя.",
    );
    return;
  }

  // VK keeps its loading screen visible until the embedded app sends Init.
  // Initialization does not request access or publish anything.
  setStatus("Подключаемся к VK…");
  try {
    await withTimeout(bridge.send("VKWebAppInit"));
  } catch {
    setStatus(
      "Не удалось подключиться к VK. Обновите приложение и попробуйте снова.",
    );
    return;
  }

  if (!button || !isTrustedVkFrame()) {
    setStatus(
      "Не удалось подтвердить безопасный запуск внутри VK. Пришлите скрин этого сообщения. Проверка доступа не запускалась.",
    );
    return;
  }
  button.disabled = false;
  setStatus("Нажмите кнопку, чтобы проверить доступ. Публикаций не будет.");
  button.addEventListener("click", () => void checkAccess());
}

void initialize();
