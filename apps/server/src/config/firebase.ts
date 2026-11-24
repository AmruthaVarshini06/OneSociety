import admin from 'firebase-admin';

const FCM_ENABLED = process.env.FCM_ENABLED === 'true';

if (FCM_ENABLED) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      '[FIREBASE] FCM_ENABLED=true but FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY is missing',
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    console.info('[FIREBASE] Firebase Admin SDK initialised');
  }
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (!FCM_ENABLED) {
    console.info(
      `[FCM MOCK] Would send: title="${title}" body="${body}" token=${fcmToken.slice(0, 10)}... data=${JSON.stringify(data ?? {})}`,
    );
    return;
  }

  await admin.messaging().send({
    token: fcmToken,
    notification: { title, body },
    data,
  });
}
