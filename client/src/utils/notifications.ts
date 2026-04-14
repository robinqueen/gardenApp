export type NotificationPermission = 'default' | 'granted' | 'denied';

const WEEKLY_DIGEST_KEY = 'mylivinggarden-last-digest';

/**
 * Checks if the browser supports notifications and service workers.
 */
export function notificationsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

/**
 * Registers the service worker. Returns the registration or null on failure.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!notificationsSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (e) {
    console.warn('SW registration failed:', e);
    return null;
  }
}

/**
 * Requests notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  const result = await Notification.requestPermission();
  return result as NotificationPermission;
}

/**
 * Gets the current notification permission state.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!notificationsSupported()) return 'denied';
  return Notification.permission as NotificationPermission;
}

interface TaskStub {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
}

/**
 * Fires a notification for tasks due today.
 * Only fires if permission is granted.
 */
export async function notifyTodayTasks(tasks: TaskStub[]): Promise<void> {
  if (getNotificationPermission() !== 'granted') return;
  if (tasks.length === 0) return;

  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({
    type: 'NOTIFY_TODAY_TASKS',
    tasks,
  });
}

/**
 * Fires the weekly digest notification if it hasn't been sent in the past 6 days.
 * Only fires on Sundays (or if forced) and only if permission is granted.
 */
export async function maybeFireWeeklyDigest(
  tasks: TaskStub[],
  force = false
): Promise<void> {
  if (getNotificationPermission() !== 'granted') return;

  const now   = new Date();
  const isSun = now.getDay() === 0;
  const isEvening = now.getHours() >= 17;

  if (!force && (!isSun || !isEvening)) return;

  // Check if we already sent a digest recently
  const lastRaw = localStorage.getItem(WEEKLY_DIGEST_KEY);
  if (lastRaw && !force) {
    const last = new Date(lastRaw);
    const daysSince = (now.getTime() - last.getTime()) / 86_400_000;
    if (daysSince < 6) return;
  }

  // Filter tasks for next 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);

  const weekTasks = tasks.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d >= today && d <= in7;
  });

  if (weekTasks.length === 0) return;

  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({
    type: 'NOTIFY_WEEKLY_DIGEST',
    tasks: weekTasks,
    count: weekTasks.length,
  });

  localStorage.setItem(WEEKLY_DIGEST_KEY, now.toISOString());
}
