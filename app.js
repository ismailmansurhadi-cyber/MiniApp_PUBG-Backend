const express = require('express');
const cors = require('cors');
const firebaseAdmin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// استيراد router صندوق الغنائم
const lootboxRouter = require('./lootbox');

// -------- Authentication --------
const verifyTelegramWebAppData = require('./auth');
const BOT_TOKEN = process.env.TELEGRAM_TOKEN; // ← المتغير الصحيح

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
    const { initData } = req.body;
    
    // 🔒 التحقق من صحة الطلب
    if (!verifyTelegramWebAppData(initData, BOT_TOKEN)) {
        return res.status(403).json({ error: 'طلب غير مصرح به' });
    }

    // 🔒 التحقق من أن المستخدم هو أنت
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr));
        if (user.id != 658500340) {
            return res.status(403).json({ error: 'ليس لديك صلاحية' });
        }
    } else {
        return res.status(403).json({ error: 'مستخدم غير معروف' });
    }

    try {
        const newSensitivity = { ...req.body };
        delete newSensitivity.initData; // لا نخزن initData في قاعدة البيانات
        const docRef = await db.collection('sensitivities').add(newSensitivity);
        res.status(201).json({ id: docRef.id, ...newSensitivity });
    } catch (error) {
        console.error('Error adding sensitivity:', error);
        res.status(500).send('An error occurred while adding sensitivity.');
    }
});

app.put('/api/sensitivities/:id', async (req, res) => {
    const { initData } = req.body;
    
    if (!verifyTelegramWebAppData(initData, BOT_TOKEN)) {
        return res.status(403).json({ error: 'طلب غير مصرح به' });
    }

    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr));
        if (user.id != 658500340) {
            return res.status(403).json({ error: 'ليس لديك صلاحية' });
        }
    } else {
        return res.status(403).json({ error: 'مستخدم غير معروف' });
    }

    try {
        const { id } = req.params;
        const updatedSensitivity = { ...req.body };
        delete updatedSensitivity.initData;
        await db.collection('sensitivities').doc(id).update(updatedSensitivity);
        res.status(200).json({ message: 'تم التعديل بنجاح.' });
    } catch (error) {
        console.error('Error updating sensitivity:', error);
        res.status(500).send('An error occurred while updating sensitivity.');
    }
});

app.delete('/api/sensitivities/:id', async (req, res) => {
    const { initData } = req.body;
    
    if (!verifyTelegramWebAppData(initData, BOT_TOKEN)) {
        return res.status(403).json({ error: 'طلب غير مصرح به' });
    }

    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr));
        if (user.id != 658500340) {
            return res.status(403).json({ error: 'ليس لديك صلاحية' });
        }
    } else {
        return res.status(403).json({ error: 'مستخدم غير معروف' });
    }

    try {
        const { id } = req.params;
        await db.collection('sensitivities').doc(id).delete();
        res.status(200).json({ message: 'تم الحذف بنجاح.' });
    } catch (error) {
        console.error('Error deleting sensitivity:', error);
        res.status(500).send('An error occurred while deleting sensitivity.');
    }
});

// ✅ === إضافة دعم "اصنع حساسيتك" ===

// GET: جلب الحساسيات المخصصة (للعرض في لوحة التحكم)
app.get('/api/custom-sensitivities', async (req, res) => {
    try {
        const snapshot = await db.collection('customSensitivities')
            .where('isActive', '==', true)
            .get();
        const data = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'فشل جلب الحساسيات المخصصة' });
    }
});

// POST: إعطاء حساسية عشوائية للمستخدم (بدون حماية - للجميع)
app.post('/api/custom-sensitivity', async (req, res) => {
    const { deviceName, deviceType, fps } = req.body;

    if (!deviceName || !deviceType || !fps ||
        !['mobile', 'tablet', 'emulator'].includes(deviceType) ||
        fps < 30 || fps > 120) {
        return res.status(400).json({ error: 'بيانات غير صالحة' });
    }

    try {
        const snapshot = await db.collection('customSensitivities')
            .where('isActive', '==', true)
            .get();
        const codes = [];
        snapshot.forEach(doc => codes.push(doc.data().code));

        if (codes.length === 0) {
            return res.status(404).json({ error: 'لا توجد حساسيات متوفرة' });
        }

        const code = codes[Math.floor(Math.random() * codes.length)];
        res.json({ code });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

// POST: إضافة حساسية مخصصة (مع حماية - لك فقط)
app.post('/api/custom-sensitivities', async (req, res) => {
    const { initData } = req.body;
    
    if (!verifyTelegramWebAppData(initData, BOT_TOKEN)) {
        return res.status(403).json({ error: 'طلب غير مصرح به' });
    }

    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr));
        if (user.id != 658500340) {
            return res.status(403).json({ error: 'ليس لديك صلاحية' });
        }
    } else {
        return res.status(403).json({ error: 'مستخدم غير معروف' });
    }

    try {
        const doc = await db.collection('customSensitivities').add({
            code: req.body.code,
            isActive: true
        });
        res.status(201).json({ id: doc.id, code: req.body.code, isActive: true });
    } catch (error) {
        res.status(500).json({ error: 'فشل إضافة الحساسية' });
    }
});

// === نهاية الإضافة ===

// ربط router صندوق الغنائم بالواجهة الخلفية
app.use('/api', lootboxRouter);

// -------- Telegram Bot --------
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = `${process.env.WEBAPP_URL}/`;
const publicUrl = process.env.PUBLIC_URL;

const bot = new TelegramBot(token, { polling: false });

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