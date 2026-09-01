import axios from "axios";

import { apiBaseUrl } from "@/lib/api/api-base-url";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
  timeout: 30_000,
});
