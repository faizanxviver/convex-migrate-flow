/* HopeX service worker — installable PWA + web push notifications. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

/* ---- Web push: show a phone notification even when the app is closed ---- */
self.addEventListener("push", (event) => {
  let data = {
    title: "HopeX",
    body: "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: "/dashboard" },
  };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch {
    /* non-JSON payload — keep defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: data.data ?? { url: "/dashboard" },
      vibrate: [100, 50, 100],
    }),
  );
});

/* Tap the notification → open the app on the target page. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.navigate(url).then(() => client.focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
