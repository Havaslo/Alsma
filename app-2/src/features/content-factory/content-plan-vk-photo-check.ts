import { HttpError } from "../../lib/http/http-error.js";
import { VkApiError, type VkClient } from "../vk/vk.client.js";

// This checks only whether VK issues a wall-photo upload address. It does not
// upload a photo or prove that a published post will actually display it.
export const verifyVkPhotoTarget = async (vk: VkClient, groupId: string) => {
  try {
    await vk.verifyWallPhotoUpload(groupId);
  } catch (error) {
    if (error instanceof VkApiError && [5, 15, 27].includes(error.code))
      throw new HttpError(
        409,
        "VK_PHOTO_UPLOAD_PERMISSION_REQUIRED",
        "VK не разрешил загрузку фотографии на стену. Пост не запланирован. Нужен проверенный пользовательский ключ с доступом к фотографиям сообщества.",
      );
    throw new HttpError(
      502,
      "VK_PHOTO_UPLOAD_CHECK_FAILED",
      "Не удалось проверить загрузку фотографии в VK. Пост не запланирован; повторите позже.",
    );
  }
};
