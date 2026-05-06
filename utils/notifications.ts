import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleHabitReminder(
  habitId: string,
  habitName: string,
  hour: number,
  minute: number,
) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`habit-${habitId}`);
    await Notifications.scheduleNotificationAsync({
      identifier: `habit-${habitId}`,
      content: {
        title: `Time for ${habitName}!`,
        body: `Don't forget your daily ${habitName}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
  }
}

export async function cancelHabitReminder(habitId: string) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`habit-${habitId}`);
  } catch {}
}

export async function syncAllReminders(
  habits: Array<{
    id: string;
    name: string;
    reminderEnabled: boolean;
    reminderHour: number;
    reminderMinute: number;
  }>,
) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const h of habits) {
      if (h.reminderEnabled) {
        await scheduleHabitReminder(h.id, h.name, h.reminderHour, h.reminderMinute);
      }
    }
  } catch {}
}
