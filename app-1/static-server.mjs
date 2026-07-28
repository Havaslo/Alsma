import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { request as createProxyRequest, createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "dist");
const canonicalRoot = await realpath(root);
const spaEntry = await realpath(resolve(root, "index.html"));
if (
  spaEntry !== canonicalRoot &&
  !spaEntry.startsWith(`${canonicalRoot}${sep}`)
) {
  throw new Error("The SPA entry point must remain inside the static root.");
}
const configuredPort = process.env.PORT?.trim();
const port = Number(configuredPort);
const backendProxyTarget = process.env.BACKEND_PROXY_TARGET?.trim();
const backendUrl = backendProxyTarget ? new URL(backendProxyTarget) : null;

if (backendUrl && backendUrl.protocol !== "http:") {
  throw new Error("BACKEND_PROXY_TARGET must use the http protocol.");
}

if (!configuredPort || !Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const securityHeaders = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
};

const sendText = (response, status, body) => {
  response.writeHead(status, {
    ...securityHeaders,
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(body);
};

const proxyApiRequest = (request, response) => {
  if (!backendUrl || !request.url) {
    sendText(response, 503, "Backend application is unavailable.\n");
    return;
  }

  const target = new URL(request.url, backendUrl);
  const proxyRequest = createProxyRequest(
    target,
    {
      headers: {
        ...request.headers,
        host: backendUrl.host,
      },
      method: request.method,
    },
    (proxyResponse) => {
      response.writeHead(
        proxyResponse.statusCode ?? 502,
        proxyResponse.headers,
      );
      proxyResponse.pipe(response);
    },
  );

  proxyRequest.on("error", () => {
    if (!response.headersSent) {
      sendText(response, 502, "Backend application request failed.\n");
      return;
    }
    response.destroy();
  });
  request.pipe(proxyRequest);
};

const resolveFile = async (pathname) => {
  const decodedPath = decodeURIComponent(pathname);
  const candidate = resolve(root, `.${decodedPath}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;

  try {
    const canonicalCandidate = await realpath(candidate);
    if (
      canonicalCandidate !== canonicalRoot &&
      !canonicalCandidate.startsWith(`${canonicalRoot}${sep}`)
    ) {
      return null;
    }
    const details = await stat(canonicalCandidate);
    if (details.isFile()) return canonicalCandidate;
  } catch {
    // Client-side routes intentionally fall through to the SPA document.
  }

  return spaEntry;
};

const server = createServer(async (request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method ?? "")) {
    sendText(response, 405, "Method not allowed.\n");
    return;
  }

  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/health") {
    sendText(response, 200, "ok\n");
    return;
  }
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    proxyApiRequest(request, response);
    return;
  }

  try {
    const file = await resolveFile(url.pathname);
    if (!file) {
      sendText(response, 400, "Invalid path.\n");
      return;
    }

    const details = await stat(file);
    response.writeHead(200, {
      ...securityHeaders,
      "Cache-Control": file.endsWith("index.html")
        ? "no-cache"
        : "public, max-age=31536000, immutable",
      "Content-Length": details.size,
      "Content-Type":
        contentTypes[extname(file).toLowerCase()] ?? "application/octet-stream",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(file).pipe(response);
  } catch {
    sendText(response, 500, "Static asset could not be served.\n");
  }
});

server.listen(port, "0.0.0.0");
