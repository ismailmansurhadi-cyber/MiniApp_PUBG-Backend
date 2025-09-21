const express = require('express');
const cors = require('cors');
const firebaseAdmin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// استيراد router صندوق الغنائم
const lootboxRouter = require('./lootbox');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.WEBAPP_URL }));

// -------- Firebase --------
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

// -------- API Routes --------
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

// ربط router صندوق الغنائم بالواجهة الخلفية
app.use('/api', lootboxRouter);

// -------- Telegram Bot --------
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = `${process.env.WEBAPP_URL}/`;
const publicUrl = process.env.PUBLIC_URL;

const bot = new TelegramBot(token, { polling: false });

// تعريف الدالة قبل استدعائها
const setWebhook = async () => {
    try {
        if (!publicUrl) return console.error('PUBLIC_URL is not defined!');
        
        const webhookUrl = `${publicUrl}/webhook/${token}`;
        const res = await axios.get(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
        console.log('Webhook set result:', res.data);
    } catch (err) {
        console.error('Failed to set webhook:', err.message);
    }
};

// استدعاء الدالة
setWebhook();

app.post(`/webhook/${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '👋 أهلاً بك! اضغط الزر أدناه لفتح التطبيق:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 فتح التطبيق', web_app: { url: webAppUrl } }]
            ]
        }
    });
});

// -------- Export for Vercel --------
module.exports = app;