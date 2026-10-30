import { HttpError } from "../../lib/http/http-error.js";
import { MetaGraphRequestError } from "../instagram-publishing/instagram-graph.client.js";
import { isInstagramPublishError } from "../instagram-publishing/instagram-publishing.service.js";

type NamedError = Error & { readonly name: string };

const isNamedError = (error: unknown, name: string): error is NamedError =>
  error instanceof Error && error.name === name;
const isMetaApiError = (error: unknown): error is MetaGraphRequestError =>
  error instanceof MetaGraphRequestError;

export const isAmbiguousProviderError = (error: unknown) => {
  if (error instanceof TypeError) return true;
  if (isNamedError(error, "TimeoutError")) return true;
  if (isNamedError(error, "MaxApiError"))
    return Number((error as NamedError & { status?: number }).status) >= 500;
  if (isNamedError(error, "TelegramApiError")) {
    const telegram = error as NamedError & {
      readonly partialPublication?: boolean;
      readonly status?: number;
    };
    return (
      Boolean(telegram.partialPublication) || Number(telegram.status) >= 500
    );
  }
  if (isNamedError(error, "VkApiError"))
    return (error as NamedError & { code?: number }).code === 10;
  if (isInstagramPublishError(error)) return error.uncertain;
  if (isMetaApiError(error)) return error.httpStatus >= 500;
  return false;
};

export const safePublicationError = (error: unknown, uncertain: boolean) => {
  if (uncertain)
    return "Платформа не подтвердила результат. Проверьте пост в соцсети перед повтором.";
  if (error instanceof HttpError) return error.message;
  if (isInstagramPublishError(error)) {
    const nested = error.cause;
    if (isMetaApiError(nested) && nested.providerCode === 190)
      return "Instagram больше не принимает сохранённый доступ. Переподключите аккаунт и повторите публикацию.";
    if (isMetaApiError(nested))
      return `Instagram отклонил публикацию (код ${nested.providerCode ?? nested.httpStatus}). Проверьте права приложения Meta и изображение.`;
    return "Instagram не принял публикацию. Проверьте подключение и повторите позже.";
  }
  if (isMetaApiError(error)) {
    if (error.providerCode === 190)
      return "Instagram больше не принимает сохранённый доступ. Переподключите аккаунт и повторите публикацию.";
    if (error.providerCode === 10 || error.providerCode === 200)
      return "У приложения Meta нет права публикации в Instagram. Проверьте разрешение instagram_content_publish.";
    if (error.providerCode === 9004 || error.providerCode === 36001)
      return "Instagram не смог загрузить изображение. Проверьте формат, размер и доступность картинки.";
    return `Instagram отклонил публикацию (код ${error.providerCode ?? error.httpStatus}). Проверьте подключение аккаунта и изображение.`;
  }
  if (isNamedError(error, "VkApiError")) {
    const code = Number((error as NamedError & { code?: number }).code);
    if ([5, 15, 27].includes(code) && /photo upload/iu.test(error.message))
      return "VK не разрешил загрузить фото. Проверьте отдельный пользовательский ключ VK: он должен действовать, быть авторизован администратором сообщества и иметь доступ к фотографиям.";
    return code === 27
      ? "VK не разрешил публикацию в сообщество. Нужен токен с правами управления сообществом (manage) и публикации (wall) либо токен сообщества с правом wall."
      : `VK отклонил публикацию (код ${code}). Проверьте права токена, текст и изображения.`;
  }
  if (isNamedError(error, "MaxApiError")) {
    const status = Number((error as NamedError & { status?: number }).status);
    return `MAX отклонил публикацию (HTTP ${status}). Проверьте права бота, канал и изображения.`;
  }
  if (isNamedError(error, "TelegramApiError")) {
    const status = Number((error as NamedError & { status?: number }).status);
    return `Telegram отклонил публикацию (HTTP ${status}). Проверьте права бота, канал и изображения.`;
  }
  return "Не удалось подготовить публикацию. Проверьте, что изображения доступны в медиатеке.";
};
