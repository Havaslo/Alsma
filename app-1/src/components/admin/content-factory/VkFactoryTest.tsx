import { useState } from "react";

import axios from "axios";
import { AlertTriangle, ClipboardPaste, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  checkVkTestAccess,
  disconnectVkPhotoTest,
  saveVkPhotoAccess,
  sendVkTest,
} from "@/lib/content-factory/vkFactoryTestApi";

import { QuietButton } from "./ContentFactoryPrimitives";

// Standard VK authorisation for a server-side key: photos and wall, one day.
// VK returns the key on its own blank page, so the address is pasted back.
const accessLink =
  "https://oauth.vk.com/authorize?client_id=54873380&display=page&redirect_uri=https%3A%2F%2Foauth.vk.com%2Fblank.html&scope=photos%2Cwall&response_type=token&revoke=1&v=5.199";

// Mirrors the primary Button styling so the access step is a real link and is
// never lost to a popup blocker.
const primaryLinkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm shadow-brand/20 transition hover:bg-brand/90 focus-visible:ring-4 focus-visible:ring-focus/20 focus-visible:outline-none";

type Status = { tone: "info" | "ok" | "error"; text: string };

type VkErrorData = { error?: string; code?: number; reason?: string };

const payloadOf = (error: unknown): VkErrorData | undefined =>
  axios.isAxiosError(error)
    ? (error.response?.data as VkErrorData | undefined)
    : undefined;

const codeSuffix = (code: number | null) =>
  code === null ? "" : ` (код ${code})`;

const saveFailure = (error: unknown): Status => {
  if (!axios.isAxiosError(error) || !error.response) {
    return {
      tone: "error",
      text: "Сервер не ответил. Доступ не сохранён — проверьте соединение и повторите.",
    };
  }
  const data = payloadOf(error);
  const code = typeof data?.code === "number" ? data.code : null;
  if (data?.error === "INVALID_ACCESS_URL") {
    return {
      tone: "error",
      text: "В адресе нет ключа. Скопируйте адрес белой страницы VK целиком — ключ идёт после знака #.",
    };
  }
  if (data?.error === "GROUP_TOKEN_MISSING") {
    return {
      tone: "error",
      text: "На сервере нет ключа тестовой группы. Сообщите об этом разработчику.",
    };
  }
  if (data?.error === "VK_ACCESS_DENIED") {
    if (code === 5 && data.reason === "IP_MISMATCH") {
      return {
        tone: "error",
        text: "VK отклонил ключ: адрес сети при входе отличается от адреса сервера. Повторный вход сам по себе не решит проблему; требуется другой способ подключения.",
      };
    }
    if (code === 5 && data.reason === "INVALID_SESSION") {
      return {
        tone: "error",
        text: "VK сообщил, что сессия авторизации недействительна. Пост не отправлялся; причина этого ответа требует проверки.",
      };
    }
    if (code === 5 && data.reason === "EXPIRED") {
      return {
        tone: "error",
        text: "VK сообщил, что срок действия ключа истёк. Пост не отправлялся.",
      };
    }
    if (code === 7 || code === 15 || code === 200 || code === 203) {
      return {
        tone: "error",
        text: `VK отказал в загрузке фото${codeSuffix(code)}. При подтверждении отметьте «Фотографии» и «Стену» и получите доступ заново.`,
      };
    }
    return {
      tone: "error",
      text: `VK не подтвердил доступ${codeSuffix(code)}. Причину по одному коду определить нельзя; пост не отправлялся.`,
    };
  }
  return {
    tone: "error",
    text: "Не удалось сохранить доступ. Откройте доступ VK заново и повторите.",
  };
};

const verificationFailure = (status: {
  ready: boolean;
  reason?: string;
  code?: number;
}): Status => {
  if (status.reason === "PHOTO_TOKEN_MISSING") {
    return {
      tone: "error",
      text: "Ключ VK не сохранён или уже истёк. Откройте доступ VK заново.",
    };
  }
  if (status.reason === "GROUP_TOKEN_MISSING") {
    return { tone: "error", text: "На сервере нет ключа тестовой группы." };
  }
  const code = typeof status.code === "number" ? status.code : null;
  return {
    tone: "error",
    text: `VK не подтвердил загрузку фото${codeSuffix(code)}. Пост не отправлялся.`,
  };
};

export const VkFactoryTest = ({
  postId,
  disabled,
}: {
  postId: string;
  disabled: boolean;
}) => {
  const [step, setStep] = useState<"start" | "paste">("start");
  const [accessUrl, setAccessUrl] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [url, setUrl] = useState("");
  const busy = checking || saving || sending;
  const startAccess = () => {
    setStatus(null);
    setStep("paste");
  };
  const verify = async (): Promise<Status> => {
    setChecking(true);
    setReady(false);
    try {
      const result = await checkVkTestAccess();
      setReady(result.ready);
      return result.ready
        ? {
            tone: "ok",
            text: "Проверка пройдена — можно отправлять тестовый пост.",
          }
        : verificationFailure(result);
    } catch {
      return {
        tone: "error",
        text: "Не удалось проверить доступ. Пост не отправлялся.",
      };
    } finally {
      setChecking(false);
    }
  };
  const save = async (value: string) => {
    setSaving(true);
    setReady(false);
    setStatus(null);
    try {
      await saveVkPhotoAccess(value);
      setAccessUrl("");
      setManualOpen(false);
      setStep("start");
      setStatus(await verify());
    } catch (error) {
      setAccessUrl("");
      setStatus(saveFailure(error));
    } finally {
      setSaving(false);
    }
  };
  const pasteAndSave = async () => {
    setStatus(null);
    let copied = "";
    try {
      copied = await navigator.clipboard.readText();
    } catch {
      setManualOpen(true);
      setStatus({
        tone: "error",
        text: "Браузер не открыл буфер обмена. Нажмите Ctrl+V в поле ниже — адрес вставится.",
      });
      return;
    }
    if (!copied.trim()) {
      setManualOpen(true);
      setStatus({
        tone: "error",
        text: "В буфере обмена нет адреса. На белой странице VK нажмите Ctrl+L, затем Ctrl+C.",
      });
      return;
    }
    setAccessUrl(copied);
    await save(copied);
  };
  const disconnect = async () => {
    setChecking(true);
    try {
      await disconnectVkPhotoTest();
      setReady(false);
      setStatus({ tone: "info", text: "Доступ удалён из памяти сервера." });
    } catch {
      setStatus({
        tone: "error",
        text: "Не удалось удалить доступ. Он исчезнет автоматически через час.",
      });
    } finally {
      setChecking(false);
    }
  };
  const publish = async () => {
    setSending(true);
    setConfirming(false);
    setStatus(null);
    setUrl("");
    try {
      const result = await sendVkTest(postId);
      setUrl(result.url);
      setReady(false);
      setStatus({
        tone: "ok",
        text: "VK подтвердил отправку. Проверьте пост и фотографию в группе.",
      });
    } catch (error) {
      const data = payloadOf(error);
      if (
        data?.error === "TEST_PREFLIGHT_FAILED" ||
        data?.error === "TEST_ACCESS_MISSING" ||
        data?.error === "INVALID_POST" ||
        data?.error === "INVALID_PHOTO"
      ) {
        setReady(false);
        setStatus({
          tone: "error",
          text: "Отправка остановлена до публикации. Проверьте доступ и сохранённый пост с одним фото.",
        });
      } else if (data?.error === "TEST_POST_DENIED") {
        setReady(false);
        setStatus({
          tone: "error",
          text: `VK отклонил публикацию${codeSuffix(typeof data.code === "number" ? data.code : null)}. Пост не создан, можно повторить после проверки доступа.`,
        });
      } else {
        setUncertain(true);
        setStatus({
          tone: "error",
          text: "Результат не подтверждён. Сначала проверьте стену Black Turtle — пост мог появиться. Не повторяйте отправку.",
        });
      }
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
      <h3 className="font-semibold">Тестовая отправка в Black Turtle</h3>
      <p>
        Пост с одним фото отправляется прямо из фабрики только в тестовую
        группу. Рабочая группа и расписание не изменяются. Пост увидят участники
        Black Turtle.
      </p>
      <div className="space-y-3 rounded-xl border border-blue-200 bg-white p-3">
        {ready ? (
          <div className="space-y-2">
            <p className="font-semibold text-emerald-800">
              Доступ VK подтверждён
            </p>
            <p>
              Сервер хранит ключ не более 60 минут. Нажмите «Отправить тестовый
              пост» ниже.
            </p>
            <QuietButton
              disabled={busy}
              onClick={() => {
                setReady(false);
                setStatus(null);
                setStep("start");
              }}
            >
              Получить доступ заново
            </QuietButton>
          </div>
        ) : step === "start" ? (
          <div className="space-y-2">
            <p className="font-semibold">
              Шаг 1 из 2. Разрешите VK загрузку фото
            </p>
            <p>
              Откроется страница VK с запросом доступа. Подтвердите «Фотографии»
              и «Стену».
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                className={cn(
                  primaryLinkClass,
                  busy && "pointer-events-none opacity-60",
                )}
                href={accessLink}
                onClick={startAccess}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-4" />
                Открыть доступ VK
              </a>
              <QuietButton
                disabled={busy}
                onClick={() => {
                  setManualOpen(true);
                  setStep("paste");
                }}
              >
                У меня уже есть адрес
              </QuietButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-semibold">
              Шаг 2 из 2. Вернитесь с адресом белой страницы
            </p>
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">
                  Пустая страница и предупреждение — это нормально
                </p>
                <p>
                  «Не копируйте данные из адресной строки» — предупреждение VK
                  против мошенников. Здесь адрес нужен вам самим: в нём лежит
                  ключ доступа, и он вставляется только в вашу фабрику. Нажмите
                  Ctrl+L, затем Ctrl+C, вернитесь в эту вкладку и сохраните
                  адрес.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="gap-2"
                disabled={busy}
                onClick={() => void pasteAndSave()}
              >
                <ClipboardPaste className="size-4" />
                {saving ? "Сохраняем…" : "Вставить из буфера и сохранить"}
              </Button>
              <QuietButton
                disabled={busy}
                onClick={() => setManualOpen((open) => !open)}
              >
                Вставить вручную
              </QuietButton>
            </div>
            {manualOpen && (
              <div className="space-y-2">
                <input
                  aria-label="Адрес страницы VK с ключом доступа"
                  autoComplete="off"
                  autoFocus
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs"
                  onChange={(event) => setAccessUrl(event.currentTarget.value)}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData("text");
                    if (pasted.trim().length < 10) return;
                    event.preventDefault();
                    setAccessUrl(pasted);
                    void save(pasted);
                  }}
                  placeholder="https://oauth.vk.com/blank.html#access_token=…"
                  spellCheck={false}
                  type="password"
                  value={accessUrl}
                />
                <QuietButton
                  disabled={busy || accessUrl.trim().length < 10}
                  onClick={() => void save(accessUrl)}
                >
                  Сохранить доступ
                </QuietButton>
              </div>
            )}
            <p className="text-xs text-slate-600">
              Адрес содержит ключ доступа. Сервер хранит его в памяти не более
              часа. Не делитесь им и не показывайте на скриншотах.
            </p>
          </div>
        )}
      </div>
      {status && (
        <p
          className={cn(
            "rounded-lg px-3 py-2",
            status.tone === "ok" && "bg-emerald-50 text-emerald-800",
            status.tone === "error" && "bg-rose-50 text-rose-800",
            status.tone === "info" && "bg-white text-slate-700",
          )}
          role="status"
        >
          {status.text}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <QuietButton
          disabled={busy}
          onClick={() => void verify().then(setStatus)}
        >
          {checking ? "Проверяем…" : "Проверить доступ"}
        </QuietButton>
        <QuietButton
          disabled={!ready || disabled || busy || uncertain || Boolean(url)}
          onClick={() => setConfirming(true)}
        >
          Отправить тестовый пост
        </QuietButton>
      </div>
      {disabled && <p>Сохраните пост VK с одним фото из медиатеки.</p>}
      {confirming && (
        <div className="space-y-2" role="alert">
          <p>
            Опубликовать сохранённый текст и фото в Black Turtle прямо сейчас?
          </p>
          <div className="flex gap-2">
            <QuietButton disabled={sending} onClick={() => void publish()}>
              Да, отправить
            </QuietButton>
            <QuietButton onClick={() => setConfirming(false)}>
              Отмена
            </QuietButton>
          </div>
        </div>
      )}
      {sending && <p role="status">Отправляем пост и фото…</p>}
      {url && (
        <a
          className="font-semibold underline"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          Открыть тестовый пост
        </a>
      )}
      {uncertain && (
        <a
          className="font-semibold underline"
          href="https://vk.ru/club138003065"
          rel="noreferrer"
          target="_blank"
        >
          Проверить стену Black Turtle
        </a>
      )}
      {step === "start" && (
        <p className="text-xs">
          <button
            className="underline decoration-slate-400 underline-offset-2 hover:text-slate-900"
            disabled={busy}
            onClick={() => void disconnect()}
            type="button"
          >
            Забыть сохранённый доступ VK
          </button>
        </p>
      )}
    </section>
  );
};
