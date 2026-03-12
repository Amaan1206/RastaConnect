const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function sendPushNotification(fcmToken, title, body, data = {}) {
  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      )
    };
    const response = await admin.messaging().send(message);
    console.log('Push notification sent:', response);
    return response;
  } catch (err) {
    console.error('Push notification error:', err.message);
    return null;
  }
}

async function notifyUser(supabaseClient, userId, title, body, data = {}) {
  try {
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user || !user.fcm_token) {
      console.log('No FCM token found for user:', userId);
      return null;
    }

    return await sendPushNotification(user.fcm_token, title, body, data);
  } catch (err) {
    console.error('notifyUser error:', err.message);
    return null;
  }
}

module.exports = { sendPushNotification, notifyUser };
