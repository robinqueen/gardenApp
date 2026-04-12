/* GardenApp Service Worker */

const CACHE_NAME = 'gardenapp-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  if (event.data.type === 'NOTIFY_TODAY_TASKS') {
    const { tasks } = event.data;
    if (!tasks || tasks.length === 0) return;

    const title = tasks.length === 1
      ? `Garden task today: ${tasks[0].title}`
      : `${tasks.length} garden tasks due today`;

    const body = tasks.length === 1
      ? tasks[0].description || 'Tap to open your garden.'
      : tasks.slice(0, 3).map(t => `• ${t.title}`).join('\n') +
        (tasks.length > 3 ? `\n…and ${tasks.length - 3} more` : '');

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'garden-today',
        renotify: false,
        data: { url: '/dashboard' },
      })
    );
  }

  if (event.data.type === 'NOTIFY_WEEKLY_DIGEST') {
    const { tasks, count } = event.data;
    if (!count || count === 0) return;

    event.waitUntil(
      self.registration.showNotification(`🌱 Garden this week — ${count} task${count > 1 ? 's' : ''}`, {
        body: tasks.slice(0, 4).map(t => `• ${t.title}`).join('\n') +
              (count > 4 ? `\n…and ${count - 4} more` : ''),
        icon: '/icon-192.png',
        tag: 'garden-weekly',
        data: { url: '/calendar' },
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(url));
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
