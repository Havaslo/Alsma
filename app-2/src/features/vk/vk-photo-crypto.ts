import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const keyBytes = (key: string) => {
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32)
    throw new Error("VK photo encryption key must contain 32 bytes");
  return bytes;
};
export const seal = (token: string, key: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(key), iv);
  cipher.setAAD(Buffer.from("alsma-vk-photo-v1"));
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
};
export const unseal = (value: string, key: string) => {
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Invalid VK photo connection");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    keyBytes(key),
    Buffer.from(iv, "base64url"),
  );
  cipher.setAAD(Buffer.from("alsma-vk-photo-v1"));
  cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    cipher.update(Buffer.from(encrypted, "base64url")),
    cipher.final(),
  ]).toString("utf8");
};
