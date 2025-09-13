const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const firebaseAdmin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Enable CORS for the frontend domain
app.use(cors({ origin: 'https://mini-app-frontend-gamma.vercel.app' }));

// PUBG API Key from Vercel Environment Variables
const PUBG_API_KEY = process.env.PUBG_API_KEY;
// Firebase Service Account from Vercel Environment Variables
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

// Initializing Firebase Admin
if (FIREBASE_SERVICE_ACCOUNT && !firebaseAdmin.apps.length) {
    try {
        const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount)
        });
        console.log('Firebase initialized successfully.');
    } catch (e) {
        console.error('Failed to parse or initialize Firebase:', e);
    }
}
const db = firebaseAdmin.firestore();

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, 'frontend/build')));

// --- API Routes for PUBG Stats ---

// Route to get PUBG player stats
app.post('/api/get-stats', async (req, res) => {
    try {
        const { playerID } = req.body;

        if (!PUBG_API_KEY) {
            return res.status(500).json({ error: 'PUBG API key not configured.' });
        }
        
        // List of common PUBG Mobile shards
        const mobileShards = ['mobile-eu', 'mobile-na', 'mobile-krjp', 'mobile-sa', 'mobile-sea'];
        let playerData = null;

        // Loop to search for the player across each shard
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
                    break; // Player found, exit the loop
                }
            } catch (error) {
                // Ignore errors from specific shards and continue to the next one
                console.error(`Error with shard ${shard}:`, error.message);
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

// --- API Routes for Sensitivities Management ---

// Route to get all sensitivities
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});