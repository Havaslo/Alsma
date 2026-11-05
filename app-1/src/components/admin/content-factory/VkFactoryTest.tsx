import { useState } from "react";

import axios from "axios";

import {
  checkVkTestAccess,
  disconnectVkPhotoTest,
  saveVkPhotoAccess,
  sendVkTest,
} from "@/lib/content-factory/vkFactoryTestApi";

import { QuietButton } from "./ContentFactoryPrimitives";

// Standard VK authorisation for a server-side key: photos and wall, one day.
const accessLink =
  "https://oauth.vk.com/authorize?client_id=54873380&display=page&redirect_uri=https%3A%2F%2Foauth.vk.com%2Fblank.html&scope=photos%2Cwall&response_type=token&revoke=1&v=5.199";

export const VkFactoryTest = ({
  postId,
  disabled,
}: {
  postId: string;
  disabled: boolean;
}) => {
  const [ready, setReady] = useState(false);
  const [accessUrl, setAccessUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const busy = checking || saving || sending;
  const check = async () => {
    setChecking(true);
    setMessage("");
    setReady(false);
    try {
      const status = await checkVkTestAccess();
      setReady(status.ready);
      setMessage(
        status.ready
          ? "Проверка доступа пройдена. Можно отправить тестовый пост."
          : status.reason === "PHOTO_TOKEN_MISSING"
            ? "Ключ VK для загрузки фото не сохранён или истёк. Вставьте ссылку из VK заново."
            : status.reason === "GROUP_TOKEN_MISSING"
              ? "Не подключён ключ тестовой группы."
              : `VK не подтвердил доступ к загрузке фото${status.code ? ` (код ${status.code})` : ""}. Пост не отправлялся.`,
      );
    } catch {
      setMessage("Не удалось проверить доступ. Пост не отправлялся.");
    } finally {
      setChecking(false);
    }
  };
  const save = async () => {
    setSaving(true);
    setMessage("");
    setReady(false);
    try {
      const result = await saveVkPhotoAccess(accessUrl);
      setAccessUrl("");
      setMessage(
        `VK принял ключ и подтвердил загрузку фото. Доступ действует ${result.expiresInMinutes} минут — нажмите «Проверить доступ».`,
      );
    } catch (error) {
      const data = axios.isAxiosError(error)
        ? (error.response?.data as
            { error?: string; code?: number } | undefined)
        : undefined;
      if (data?.error === "VK_ACCESS_DENIED")
        setMessage(
          `VK не принял ключ из этой ссылки${typeof data.code === "number" ? ` (код ${data.code})` : ""}. Скопируйте адрес из адресной строки целиком.`,
        );
      else if (data?.error === "INVALID_ACCESS_URL")
        setMessage(
          "В ссылке не найден ключ доступа. Нужен полный адрес со страницы VK, включая часть после знака #.",
        );
      else if (data?.error === "GROUP_TOKEN_MISSING")
        setMessage("Не подключён ключ тестовой группы.");
      else
        setMessage(
          "Не удалось сохранить доступ. Получите ссылку в VK заново и повторите.",
        );
    } finally {
      setSaving(false);
    }
  };
  const disconnect = async () => {
    setChecking(true);
    try {
      await disconnectVkPhotoTest();
      setReady(false);
      setMessage("Доступ удалён из памяти сервера.");
    } catch {
      setMessage(
        "Не удалось удалить доступ. Он исчезнет автоматически через час.",
      );
    } finally {
      setChecking(false);
    }
  };
  const publish = async () => {
    setSending(true);
    setConfirming(false);
    setMessage("");
    setUrl("");
    try {
      const result = await sendVkTest(postId);
      setUrl(result.url);
      setReady(false);
      setMessage(
        "VK подтвердил отправку. Проверьте пост и фотографию в группе.",
      );
    } catch (error) {
      const data = axios.isAxiosError(error)
        ? (error.response?.data as
            { error?: string; code?: number } | undefined)
        : undefined;
      if (
        data?.error === "TEST_PREFLIGHT_FAILED" ||
        data?.error === "TEST_ACCESS_MISSING" ||
        data?.error === "INVALID_POST" ||
        data?.error === "INVALID_PHOTO"
      ) {
        setReady(false);
        setMessage(
          "Отправка остановлена до публикации. Проверьте доступ и сохранённый пост с одним фото.",
        );
      } else if (data?.error === "TEST_POST_DENIED") {
        setReady(false);
        setMessage(
          `VK отклонил публикацию${typeof data.code === "number" ? ` (код ${data.code})` : ""}. Пост не создан, можно повторить после проверки доступа.`,
        );
      } else {
        setUncertain(true);
        setMessage(
          "Результат не подтверждён. Сначала проверьте стену Black Turtle — пост мог появиться. Не повторяйте отправку.",
        );
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
      <div className="space-y-2 rounded-xl border border-blue-200 bg-white p-3">
        <p>
          1.{" "}
          <a
            className="font-semibold underline"
            href={accessLink}
            target="_blank"
            rel="noreferrer"
          >
            Откройте доступ VK
          </a>{" "}
          и подтвердите «Фотографии» и «Стену».
        </p>
        <p>
          2. После подтверждения откроется пустая страница VK. Скопируйте её
          адрес из адресной строки целиком и вставьте ниже.
        </p>
        <input
          aria-label="Адрес страницы VK с ключом доступа"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://oauth.vk.com/blank.html#access_token=…"
          value={accessUrl}
          onChange={(event) => setAccessUrl(event.currentTarget.value)}
          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <QuietButton
            disabled={busy || accessUrl.trim().length < 10}
            onClick={() => void save()}
          >
            {saving ? "Сохраняем…" : "Сохранить доступ"}
          </QuietButton>
          <QuietButton disabled={busy} onClick={() => void disconnect()}>
            Удалить доступ
          </QuietButton>
        </div>
        <p>
          Адрес содержит ключ доступа: он сохраняется только в памяти сервера на
          час и никуда не записывается. Не пересылайте его никому.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <QuietButton disabled={busy || uncertain} onClick={() => void check()}>
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
        <div role="alert" className="space-y-2">
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
      {message && <p role="status">{message}</p>}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline"
        >
          Открыть тестовый пост
        </a>
      )}
      {uncertain && (
        <a
          href="https://vk.ru/club138003065"
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline"
        >
          Проверить стену Black Turtle
        </a>
      )}
    </section>
  );
};
