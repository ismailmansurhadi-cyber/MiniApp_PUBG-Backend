const express = require('express');
const cors = require('cors');
const firebaseAdmin = require('firebase-admin');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: process.env.WEBAPP_URL }));

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

if (FIREBASE_SERVICE_ACCOUNT && !firebaseAdmin.apps.length) {
    try {
        const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error('Failed to parse or initialize Firebase:', e);
    }
}
const db = firebaseAdmin.firestore();

// Route to get all sensitivities from Firestore
app.get('/api/sensitivities', async (req, res) => {
    try {
        const snapshot = await db.collection('sensitivities').get();
        const sensitivities = [];
        snapshot.forEach(doc => {
            sensitivities.push({ id: doc.id, ...doc.data() });
        });
        res.json(sensitivities);
    } catch (error) {
        console.error('Error fetching sensitivities:', error);
        res.status(500).send('An error occurred while fetching sensitivities.');
    }
});

// Route to add a new sensitivity record
app.post('/api/sensitivities', async (req, res) => {
    try {
        const newSensitivity = req.body;
        const docRef = await db.collection('sensitivities').add(newSensitivity);
        res.status(201).json({ id: docRef.id, ...newSensitivity });
    } catch (error) {
        console.error('Error adding sensitivity:', error);
        res.status(500).send('An error occurred while adding sensitivity.');
    }
});

// Route to update a sensitivity record
app.put('/api/sensitivities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedSensitivity = req.body;
        await db.collection('sensitivities').doc(id).update(updatedSensitivity);
        res.status(200).json({ message: 'Sensitivity updated successfully.' });
    } catch (error) {
        console.error('Error updating sensitivity:', error);
        res.status(500).send('An error occurred while updating sensitivity.');
    }
});

// Route to delete a sensitivity record
app.delete('/api/sensitivities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('sensitivities').doc(id).delete();
        res.status(200).json({ message: 'Sensitivity deleted successfully.' });
    } catch (error) {
        console.error('Error deleting sensitivity:', error);
        res.status(500).send('An error occurred while deleting sensitivity.');
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// -----------------------------------------------------------------------------------
// هذا هو كود البوت الذي تم دمجه مع كود الخادم
// -----------------------------------------------------------------------------------

// استخدم متغيرات البيئة بدلاً من التوكن والرابط المباشر
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

// قم بإنشاء كائن البوت
const bot = new TelegramBot(token, { polling: true });

// هذا الكود يستمع لأمر /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // إرسال رسالة ترحيب مع زر "فتح التطبيق"
  bot.sendMessage(chatId, 'أهلاً بك! انقر على الزر أدناه لفتح التطبيق:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'فتح التطبيق',
            web_app: { url: webAppUrl }
          }
        ]
      ]
    }
  });
});