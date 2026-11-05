import { useState } from "react";

import axios from "axios";

import {
  checkVkTestAccess,
  sendVkTest,
} from "@/lib/content-factory/vkFactoryTestApi";

import { QuietButton } from "./ContentFactoryPrimitives";

export const VkFactoryTest = ({
  postId,
  disabled,
}: {
  postId: string;
  disabled: boolean;
}) => {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
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
            ? "Не подключён пользовательский доступ VK для загрузки фото. Тест пока не отправится."
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
      const code = axios.isAxiosError(error)
        ? error.response?.data?.error
        : undefined;
      if (
        code === "TEST_PREFLIGHT_FAILED" ||
        code === "TEST_ACCESS_MISSING" ||
        code === "INVALID_POST" ||
        code === "INVALID_PHOTO"
      ) {
        setReady(false);
        setMessage(
          "Отправка остановлена до публикации. Проверьте доступ и сохранённый пост с одним фото.",
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
      <div className="flex flex-wrap gap-2">
        <QuietButton
          disabled={checking || sending || uncertain}
          onClick={() => void check()}
        >
          {checking ? "Проверяем…" : "Проверить доступ"}
        </QuietButton>
        <QuietButton
          disabled={!ready || disabled || sending || uncertain || Boolean(url)}
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
