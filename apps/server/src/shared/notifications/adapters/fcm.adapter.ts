import { sendPushNotification } from '../../../config/firebase';

/**
 * FCM adapter: wraps the firebase config function.
 * FCM_ENABLED=false → logs only. FCM_ENABLED=true → real push.
 */
export async function sendFcmPush(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  await sendPushNotification(fcmToken, title, body, data);
}
