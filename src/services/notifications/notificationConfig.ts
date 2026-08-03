import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Configures how notifications are handled when the app is in the foreground.
 * Notifications will show as banners and appear in the notification list.
 *
 * Requisito 10.1: Funciona en iOS, Android y web.
 * Requisito 5.3, 5.4: Notificaciones locales y push para alertas de presupuesto.
 * Requisito 6.2: Notificaciones para recordatorios de pagos.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Requests notification permissions from the user.
 * On Android 13+, creates a default notification channel before requesting permissions.
 *
 * @returns Whether permissions were granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('budget-alerts', {
      name: 'Alertas de presupuesto',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Recordatorios de pago',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Initializes the notification system on app start.
 * Configures the foreground handler and requests permissions.
 */
export async function initializeNotifications(): Promise<void> {
  configureNotificationHandler();
  await requestNotificationPermissions();
}
