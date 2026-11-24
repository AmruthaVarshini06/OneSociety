import { sendPushNotification } from '../../../config/firebase';

export async function sendFcmPush(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  await sendPushNotification(fcmToken, title, body, data);
}
