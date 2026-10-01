self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data?.json() ?? {};
  } catch {
    message = {};
  }

  const title =
    typeof message.title === "string" ? message.title : "АЛСМА — новое событие";
  const body =
    typeof message.body === "string" ? message.body : "Откройте админ-панель.";
  const tag = typeof message.tag === "string" ? message.tag : "alsma-admin";
  const path =
    typeof message.url === "string" && message.url.startsWith("/admin")
      ? message.url
      : "/admin";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/admin-icon-192.png",
      badge: "/icons/admin-icon-192.png",
      tag,
      data: { path },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.path;
  const target =
    typeof path === "string" && path.startsWith("/admin")
      ? new URL(path, self.location.origin)
      : new URL("/admin", self.location.origin);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const current = clients.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
        if (current) {
          const navigated = await current.navigate(target.href);
          await (navigated ?? current).focus();
          return;
        }
        await self.clients.openWindow(target.href);
      }),
  );
});
