const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// تهيئة Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// مسار لجلب جميع الحساسيات
app.get('/api/sensitivities', async (req, res) => {
    try {
        const proCollection = await db.collection('pro').get();
        const beginnerCollection = await db.collection('beginner').get();
        
        const proSensitivities = proCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const beginnerSensitivities = beginnerCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json({
            pro: proSensitivities,
            beginner: beginnerSensitivities
        });
    } catch (error) {
        console.error('Failed to fetch data from Firestore:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// مسار لإضافة حساسية جديدة
app.post('/api/sensitivities/:type', async (req, res) => {
    const { name, code, imageUrl } = req.body;
    const type = req.params.type;
    
    if (type !== 'pro' && type !== 'beginner') {
        return res.status(400).json({ error: 'Invalid sensitivity type' });
    }

    try {
        const docRef = await db.collection(type).add({
            name,
            code,
            imageUrl,
            type,
            createdAt: admin.firestore.FieldValue.serverTimestamp() // إضافة timestamp
        });
        res.status(201).json({ id: docRef.id, name, code, imageUrl, type });
    } catch (error) {
        console.error('Failed to add sensitivity to Firestore:', error);
        res.status(500).json({ error: 'Failed to add sensitivity' });
    }
});

// مسار لتحديث حساسية موجودة
app.put('/api/sensitivities/:id', async (req, res) => {
    const { id } = req.params;
    const { name, code, imageUrl, type } = req.body;

    try {
        const docRef = db.collection(type).doc(id);
        await docRef.update({ name, code, imageUrl, type });
        res.json({ message: 'Sensitivity updated successfully' });
    } catch (error) {
        console.error('Failed to update sensitivity in Firestore:', error);
        res.status(500).json({ error: 'Failed to update sensitivity' });
    }
});

// مسار لحذف حساسية
app.delete('/api/sensitivities/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // ابحث عن الحساسية في كلا المجموعتين للحذف
        const proDoc = await db.collection('pro').doc(id).get();
        if (proDoc.exists) {
            await db.collection('pro').doc(id).delete();
            return res.json({ message: 'Sensitivity deleted successfully' });
        }

        const beginnerDoc = await db.collection('beginner').doc(id).get();
        if (beginnerDoc.exists) {
            await db.collection('beginner').doc(id).delete();
            return res.json({ message: 'Sensitivity deleted successfully' });
        }
        
        res.status(404).json({ error: 'Sensitivity not found' });
    } catch (error) {
        console.error('Failed to delete sensitivity from Firestore:', error);
        res.status(500).json({ error: 'Failed to delete sensitivity' });
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});