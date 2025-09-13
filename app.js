const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// هذا السطر يضمن أن المفتاح السري يتم جلبه من Vercel
const PUBG_API_KEY = process.env.PUBG_API_KEY;

// تهيئة Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Middleware
app.use(express.json());
app.use(cors({ origin: 'https://mini-app-frontend-gamma.vercel.app' }));

// مسار الـ API لاختبار المفتاح بشكل مباشر
app.get('/api/test-key', async (req, res) => {
    try {
        // نستخدم ID لاعب عام للتأكد من أن الاتصال بالـ API يعمل
        const response = await axios.get(`https://api.pubg.com/shards/steam/players?filter[playerNames]=shroud`, {
            headers: {
                'Authorization': `Bearer ${PUBG_API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });
        
        // إذا نجح الطلب، فهذا يعني أن المفتاح يعمل
        if (response.status === 200) {
            return res.status(200).json({ message: 'API Key is working successfully!' });
        }
    } catch (error) {
        // إذا فشل، سنقوم بإرجاع الخطأ الدقيق
        console.error('API Key test failed:', error.response.status, error.response.statusText);
        return res.status(error.response.status).json({
            error: `API Key test failed with status: ${error.response.status} - ${error.response.statusText}`
        });
    }
});

// مسار الـ API للحصول على إحصائيات اللاعب
app.post('/api/get-stats', async (req, res) => {
    try {
        const { playerID } = req.body;
        
        if (!playerID) {
            return res.status(400).json({ error: 'Player ID is required.' });
        }

        const mobileShards = ['mobile-eu', 'mobile-na', 'mobile-krjp', 'mobile-sa', 'mobile-sea'];
        let playerData = null;

        for (const shard of mobileShards) {
            try {
                const response = await axios.get(`https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${playerID}`, {
                    headers: {
                        'Authorization': `Bearer ${PUBG_API_KEY}`,
                        'Accept': 'application/vnd.api+json'
                    }
                });
                
                if (response.data.data.length > 0) {
                    playerData = response.data.data[0];
                    break;
                }
            } catch (error) {
                continue;
            }
        }

        if (!playerData) {
            return res.status(404).json({ error: 'Player not found on any shard.' });
        }

        const playerStats = playerData.attributes.stats;

        res.json({
            playerName: playerData.attributes.name,
            kdRatio: playerStats.kd.value,
            winRate: playerStats.wins.value,
        });
    } catch (error) {
        console.error('Error fetching PUBG stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch player stats.' });
    }
});

// مسارات Firebase
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
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(201).json({ id: docRef.id, name, code, imageUrl, type });
    } catch (error) {
        console.error('Failed to add sensitivity to Firestore:', error);
        res.status(500).json({ error: 'Failed to add sensitivity' });
    }
});

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

app.delete('/api/sensitivities/:id', async (req, res) => {
    try {
        const { id } = req.params;
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});