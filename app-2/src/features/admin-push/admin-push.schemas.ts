import { z } from "zod";

const endpointSchema = z
  .string()
  .url()
  .max(4_096)
  .superRefine((value, context) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return;
    }
    const host = url.hostname.toLowerCase();
    const allowedHosts = [
      "fcm.googleapis.com",
      "push.services.mozilla.com",
      "push.apple.com",
      "notify.windows.com",
    ];
    const isAllowedHost = allowedHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !isAllowedHost
    ) {
      context.addIssue({
        code: "custom",
        message: "The push endpoint is not a supported browser push service.",
      });
    }
  });

export const pushSubscriptionBodySchema = z
  .object({
    endpoint: endpointSchema,
    keys: z
      .object({
        auth: z.string().min(1).max(256),
        p256dh: z.string().min(1).max(256),
      })
      .strict(),
  })
  .strict();

export const pushSubscriptionEndpointBodySchema = z
  .object({
    endpoint: endpointSchema,
  })
  .strict();

export type PushSubscriptionBody = z.infer<typeof pushSubscriptionBodySchema>;
