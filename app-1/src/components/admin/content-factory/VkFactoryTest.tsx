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
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const verify = async () => {
    setBusy(true);
    setReady(false);
    try {
      const result = await checkVkTestAccess();
      setReady(result.ready);
      setMessage(
        result.ready
          ? "Сервер подтвердил доступ к загрузке фото в тестовую группу."
          : result.reason === "GROUP_TOKEN_MISSING"
            ? "Не настроен ключ тестовой группы."
            : "Доступ к фото не подтверждён. Проверьте подключение фотографий VK в контент-плане и права аккаунта в Black Turtle.",
      );
    } catch {
      setMessage("Не удалось проверить доступ VK.");
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    setConfirming(false);
    setBusy(true);
    try {
      const result = await sendVkTest(postId);
      setUrl(result.url);
      setReady(false);
      setMessage(
        "VK подтвердил отправку. Проверьте фотографию в опубликованном посте.",
      );
    } catch (error) {
      const data = axios.isAxiosError(error)
        ? (error.response?.data as
            { error?: string; code?: number } | undefined)
        : undefined;
      setReady(false);
      if (data?.error === "TEST_POST_DENIED")
        setMessage(
          `VK отклонил тестовую отправку (код ${data.code ?? "неизвестен"}).`,
        );
      else if (
        [
          "TEST_PREFLIGHT_FAILED",
          "TEST_ACCESS_MISSING",
          "INVALID_POST",
          "INVALID_PHOTO",
        ].includes(data?.error ?? "")
      )
        setMessage(
          "Отправка остановлена до публикации. Проверьте доступ и сохранённый пост с одним фото.",
        );
      else {
        setUncertain(true);
        setMessage(
          "Результат не подтверждён. Проверьте стену Black Turtle перед повтором.",
        );
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
      <h3 className="font-semibold">Тестовая отправка в Black Turtle</h3>
      <p>
        Сохранённый пост с одним фото будет опубликован в тестовой группе. Пост
        увидят участники Black Turtle.
      </p>
      <p>
        Сначала подключите фотографии VK в контент-плане. Аккаунт должен иметь
        права и в тестовой группе.
      </p>
      {message && <p role="status">{message}</p>}
      {disabled && <p>Сохраните пост VK с одним фото из медиатеки.</p>}
      <div className="flex flex-wrap gap-2">
        <QuietButton disabled={busy} onClick={() => void verify()}>
          Проверить доступ
        </QuietButton>
        <QuietButton
          disabled={!ready || disabled || busy || uncertain || Boolean(url)}
          onClick={() => setConfirming(true)}
        >
          Отправить тестовый пост
        </QuietButton>
      </div>
      {confirming && (
        <div role="alert">
          <p>Опубликовать текст и фотографию в Black Turtle сейчас?</p>
          <QuietButton disabled={busy} onClick={() => void publish()}>
            Да, отправить
          </QuietButton>
          <QuietButton onClick={() => setConfirming(false)}>Отмена</QuietButton>
        </div>
      )}
      {url && (
        <a className="underline" href={url} target="_blank" rel="noreferrer">
          Открыть тестовый пост
        </a>
      )}
      {uncertain && (
        <a
          className="underline"
          href="https://vk.ru/club138003065"
          target="_blank"
          rel="noreferrer"
        >
          Проверить стену Black Turtle
        </a>
      )}
    </section>
  );
};
