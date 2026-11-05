import { VkApiError } from "./vk.client.js";

// Only fixed labels leave the server: VK error messages may contain credentials.
export const photoAuthDiagnostic = (error: unknown) => {
  if (!(error instanceof VkApiError) || error.code !== 5) return "UNKNOWN";
  if (/access_token was given to another ip address/i.test(error.message))
    return "IP_MISMATCH";
  if (/access token has expired|access_token has expired/i.test(error.message))
    return "EXPIRED";
  if (/invalid session/i.test(error.message)) return "INVALID_SESSION";
  return "AUTH_FAILED";
};
