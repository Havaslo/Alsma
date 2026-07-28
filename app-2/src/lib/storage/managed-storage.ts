export type ManagedStorageUploadInput = {
  readonly contentType: string;
  readonly name: string;
  readonly sizeBytes: number;
};

export type ManagedStorageUpload = {
  readonly expiresAt: string;
  readonly objectId: string;
  readonly uploadFields: Readonly<Record<string, string>>;
  readonly uploadUrl: string;
};

export type ManagedStorageDownload = {
  readonly contentType: string;
  readonly downloadUrl: string;
  readonly expiresAt: string;
  readonly sizeBytes: number;
};

type ManagedStorageConfig = {
  readonly apiUrl: string;
  readonly projectToken: string;
};

const readError = async (response: Response): Promise<string> => {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload && "message" in payload) {
      const message = payload.message;
      if (typeof message === "string" && message.trim()) return message;
    }
  } catch {
    // The response body is optional at this boundary.
  }
  return `Managed storage request failed with status ${response.status}.`;
};

export const createManagedStorage = ({
  apiUrl,
  projectToken,
}: ManagedStorageConfig) => {
  const request = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> => {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${projectToken}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error(await readError(response));
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  };

  return {
    createUpload: (
      input: ManagedStorageUploadInput,
    ): Promise<ManagedStorageUpload> =>
      request("/uploads", { body: JSON.stringify(input), method: "POST" }),
    deleteObject: (objectId: string): Promise<void> =>
      request(`/objects/${encodeURIComponent(objectId)}`, { method: "DELETE" }),
    getDownload: (objectId: string): Promise<ManagedStorageDownload> =>
      request(`/objects/${encodeURIComponent(objectId)}/download`),
  } as const;
};
