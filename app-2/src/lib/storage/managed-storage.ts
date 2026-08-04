export type ManagedStorageUploadInput = {
  readonly content: Uint8Array;
  readonly contentType: string;
  readonly name: string;
};

export type ManagedStorageUpload = {
  readonly objectId: string;
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

const readUpload = async (
  response: Response,
): Promise<ManagedStorageUpload> => {
  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    !payload ||
    !("objectId" in payload) ||
    typeof payload.objectId !== "string" ||
    !payload.objectId.trim()
  ) {
    throw new Error("Managed storage returned an invalid upload response.");
  }
  return { objectId: payload.objectId };
};

export const createManagedStorage = ({
  apiUrl,
  projectToken,
}: ManagedStorageConfig) => {
  const baseUrl = apiUrl.replace(/\/$/, "");
  const request = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${projectToken}`,
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error(await readError(response));
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  };

  return {
    upload: async (
      input: ManagedStorageUploadInput,
    ): Promise<ManagedStorageUpload> => {
      const bytes = new ArrayBuffer(input.content.byteLength);
      new Uint8Array(bytes).set(input.content);
      const form = new FormData();
      form.append(
        "file",
        new Blob([bytes], { type: input.contentType }),
        input.name,
      );
      const response = await fetch(`${baseUrl}/uploads`, {
        body: form,
        headers: { Authorization: `Bearer ${projectToken}` },
        method: "POST",
      });
      if (!response.ok) throw new Error(await readError(response));
      return readUpload(response);
    },
    deleteObject: (objectId: string): Promise<void> =>
      request(`/objects/${encodeURIComponent(objectId)}`, { method: "DELETE" }),
    getDownload: (objectId: string): Promise<ManagedStorageDownload> =>
      request(`/objects/${encodeURIComponent(objectId)}/download`),
  } as const;
};
