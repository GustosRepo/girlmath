import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { BillReminder } from '../types';
import { fmt$ } from './finance';

// ── Configure how notifications appear while app is open ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Android channel ────────────────────────────────────────
export async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bills', {
      name: 'Bill Reminders 💸',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF69B4',
      sound: 'default',
    });
  }
}

// ── Request permission ─────────────────────────────────────
export async function requestNotifPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('[notifs] skipping — not a physical device');
    return false;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Helpers ────────────────────────────────────────────────
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Returns the next calendar date for a given day-of-month at 9am. */
function nextDateForDay(day: number): Date {
  const now = new Date();
  // clamp day to valid range for this month
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDay);

  const candidate = new Date(now.getFullYear(), now.getMonth(), clampedDay, 9, 0, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    // Already passed — move to next month
    candidate.setMonth(candidate.getMonth() + 1);
    // Re-clamp for the new month
    const nextLastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
    candidate.setDate(Math.min(day, nextLastDay));
  }
  return candidate;
}

// ── Schedule 3 notifications per bill ─────────────────────
// Fires at: due day, 1 day before, 3 days before (each at 9am)
export async function scheduleBillNotifs(bill: BillReminder): Promise<string[]> {
  const granted = await requestNotifPermission();
  if (!granted) return [];

  const ids: string[] = [];
  const dueDate = nextDateForDay(bill.dueDay);

  const scheduleAt = async (date: Date, title: string, body: string) => {
    if (date.getTime() <= Date.now()) return; // skip if in the past
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'bills' } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
      ids.push(id);
    } catch (e) {
      console.warn('[notifs] schedule failed', e);
    }
  };

  // 3 days before
  const threeDaysBefore = new Date(dueDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  await scheduleAt(
    threeDaysBefore,
    `${bill.emoji} ${bill.name} due in 3 days`,
    `${bill.name} (${fmt$(bill.amount)}) is due on the ${ordinal(bill.dueDay)} 💸`,
  );

  // 1 day before
  const oneDayBefore = new Date(dueDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);
  await scheduleAt(
    oneDayBefore,
    `${bill.emoji} ${bill.name} due TOMORROW 🚨`,
    `Don't forget ${bill.name} (${fmt$(bill.amount)}) — due tomorrow bestie!`,
  );

  // Due day
  await scheduleAt(
    dueDate,
    `🚨 ${bill.name} is DUE TODAY`,
    `${bill.name} (${fmt$(bill.amount)}) is due today — pay it queen 💀`,
  );

  return ids;
}

// ── Cancel all notifications for a bill ───────────────────
export async function cancelBillNotifs(notifIds: string[]): Promise<void> {
  await Promise.all(
    notifIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}

// ── Re-schedule all bills (call on app load or "new month") ─
export async function rescheduleAllBills(bills: BillReminder[]): Promise<BillReminder[]> {
  const updated: BillReminder[] = [];
  for (const bill of bills) {
    if (bill.notifIds?.length) {
      await cancelBillNotifs(bill.notifIds);
    }
    const notifIds = await scheduleBillNotifs(bill);
    updated.push({ ...bill, notifIds });
  }
  return updated;
}
