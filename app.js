const express = require('express');
const cors = require('cors');
const firebaseAdmin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.WEBAPP_URL }));

// -------- Firebase --------
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
if (FIREBASE_SERVICE_ACCOUNT && !firebaseAdmin.apps.length) {
  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error('Failed to parse or initialize Firebase:', e);
  }
}
const db = firebaseAdmin.firestore();

// -------- API Routes --------
app.get('/api/sensitivities', async (req, res) => {
  try {
    const snapshot = await db.collection('sensitivities').get();
    const sensitivities = [];
    snapshot.forEach(doc => sensitivities.push({ id: doc.id, ...doc.data() }));
    res.json(sensitivities);
  } catch (error) {
    res.status(500).send('Error fetching sensitivities.');
  }
});

// باقي الـ CRUD (post/put/delete) كما لديك...

// -------- Telegram Bot --------
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const bot = new TelegramBot(token);

// نقطة استقبال التحديثات من تيليجرام
app.post(`/webhook/${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// رسالة الترحيب
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👋 أهلاً بك! انقر على الزر أدناه لفتح التطبيق:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 فتح التطبيق', web_app: { url: webAppUrl } }]
      ]
    }
  });
});

// -------- تشغيل الخادم والـ Webhook --------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});