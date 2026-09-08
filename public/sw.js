/* Team Leaderboard push service worker.
 * Plain script (no build step) served verbatim from /sw.js.
 * Handles push events, displays notifications, and routes clicks
 * back into the app. No app logic lives here. */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = {};
  }
  const title =
    typeof data.title === 'string' && data.title ? data.title.slice(0, 80) : 'Team Leaderboard';
  const body = typeof data.body === 'string' ? data.body.slice(0, 200) : '';
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/';
  const tag = typeof data.tag === 'string' && data.tag ? data.tag : undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
      // One notification per weekly update; a repeat for the same event
      // replaces rather than stacks.
      renotify: false,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data;
  const url =
    raw && typeof raw.url === 'string' && raw.url.startsWith('/') ? raw.url : '/';
  const target = self.location.origin + url;

  event.waitUntil(
    (async () => {
      try {
        const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const win of windows) {
          try {
            if (win.url === target) {
              await win.focus();
              return;
            }
          } catch (_) {
            // fall through to open/focus another client
          }
        }
        for (const win of windows) {
          try {
            if (win.url.startsWith(self.location.origin)) {
              await win.focus();
              try {
                await win.navigate(target);
              } catch (_) {
                // navigate() isn't universal; focus alone is fine
              }
              return;
            }
          } catch (_) {
            // fall through
          }
        }
        await clients.openWindow(target);
      } catch (_) {
        // Never leave a hanging click with no response
        try {
          await clients.openWindow(target);
        } catch (_) {
          // ignore
        }
      }
    })(),
  );
});
