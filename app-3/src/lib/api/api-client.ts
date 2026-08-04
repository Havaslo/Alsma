import axios, { type AxiosInstance } from "axios";

export const createApiClient = (baseUrl: string): AxiosInstance => {
  const normalizedBaseUrl = baseUrl.trim();
  if (!normalizedBaseUrl) {
    throw new Error("An explicit API base URL is required.");
  }

  return axios.create({
    baseURL: normalizedBaseUrl,
    headers: {
      Accept: "application/json",
    },
    timeout: 30_000,
  });
};
