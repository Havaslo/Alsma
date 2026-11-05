import { useState } from "react";

import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

import { QuietButton } from "./ContentFactoryPrimitives";

export const VkFactoryTest = ({
  postId,
  disabled,
}: {
  postId: string;
  disabled: boolean;
}) => {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const prepare = async () => {
    setBusy(true);
    setMessage("");
    setCode("");
    try {
      const response = await apiClient.post<{ code: string }>(
        "/vk-factory-test/prepare",
        { postId },
        { headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` } },
      );
      setCode(response.data.code);
    } catch {
      setMessage(
        "Не удалось подготовить тест. Убедитесь, что пост сохранён, выбран VK и приложено одно изображение из медиатеки до 10 МБ.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
      <h3 className="font-semibold">Тест в группе Black Turtle</h3>
      <p>
        Отправим сохранённый текст и одно фото только в тестовую группу. Рабочая
        группа и расписание не изменятся. Пост увидят участники Black Turtle.
      </p>
      <QuietButton disabled={disabled || busy} onClick={() => void prepare()}>
        {busy ? "Подготовка…" : "Подготовить тест"}
      </QuietButton>
      {disabled && <p>Сохраните изменения и выберите пост VK с одним фото.</p>}
      {message && (
        <p role="alert" className="text-rose-700">
          {message}
        </p>
      )}
      {code && (
        <div className="space-y-2">
          <p>
            Скопируйте одноразовый код, затем откройте{" "}
            <a
              className="font-semibold underline"
              href="https://vk.ru/app54873380"
              target="_blank"
              rel="noreferrer"
            >
              тестовое приложение VK
            </a>
            , вставьте код и подтвердите отправку. Код действует 15 минут;
            никому его не передавайте.
          </p>
          <input
            aria-label="Одноразовый код теста"
            readOnly
            value={code}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs"
          />
          <button
            type="button"
            className="font-semibold underline"
            onClick={() =>
              void navigator.clipboard.writeText(code).then(
                () => setMessage("Код скопирован."),
                () => setMessage("Выделите и скопируйте код вручную."),
              )
            }
          >
            Скопировать код
          </button>
        </div>
      )}
    </section>
  );
};
