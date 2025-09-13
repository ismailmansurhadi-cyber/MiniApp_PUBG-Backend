// الجزء الأول: تعريف المكتبات
// هذا السطر مهم جداً، يجب إضافته في البداية
const axios = require('axios');

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// ** مهم جداً: ضع مفتاح API الخاص بـ PUBG هنا **
const PUBG_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI2ODY5MGNkMC03MmNkLTAxM2UtOTI1OC0xMmExNjY3ZGU2ODIiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzU3NzY3NTEwLCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InB1Ymctc2Vuc2UtY29kIn0.ubIP5IewhoIVuQ14CtD-7uBZI1ptvWKAmgPxgzb07TQ';

// تهيئة Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
app.use(express.json());
app.use(cors({ origin: 'https://mini-app-frontend-gamma.vercel.app' }));

const PORT = process.env.PORT || 3000;

// الجزء الثاني: مسارات الـ API الحالية (كما هي في كودك)
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
        const { id } = req.params;
        
        try {
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

// الجزء الثالث: مسار الـ API الجديد لتحليل الأداء
app.post('/api/get-stats', async (req, res) => {
    try {
        const { playerID } = req.body;

        if (!playerID) {
            return res.status(400).json({ error: 'Player ID is required.' });
        }

        const response = await axios.get(`https://api.pubg.com/shards/steam/players?filter[playerNames]=${playerID}`, {
            headers: {
                'Authorization': `Bearer ${PUBG_API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });

        const playerData = response.data.data[0];
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

// الجزء الأخير: تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});