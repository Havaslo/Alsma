import { request } from "node:https";

// Used only by the authenticated, fixed-community preparation diagnostic.
// The caller validates the VK-issued capability URL; it is never logged.
export const uploadVkPhotoWithHttps = (
  url: string,
  body: Uint8Array,
  headers: Record<string, string>,
): Promise<Response> =>
  new Promise((resolve, reject) => {
    const req = request(
      url,
      { method: "POST", headers, signal: AbortSignal.timeout(30_000) },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 200_000) {
            res.destroy(new Error("VK upload response too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", () => reject(new Error("VK photo transport failed")));
        res.on("end", () =>
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 502,
            }),
          ),
        );
      },
    );
    req.on("error", () => reject(new Error("VK photo transport failed")));
    req.end(body);
  });
