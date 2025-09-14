const express = require('express');
const router = express.Router();

// This is where we will store the last 10 winners
// NOTE: This list will reset every time you deploy, for simplicity.
const lastLooters = [];

const lootItems = [
    { name: 'خوذة الجحيم 😈', imageUrl: 'https://i.ibb.co/L5Q3F2v/hell-helmet.png' },
    { name: 'بندقية M416 الأسطورية ✨', imageUrl: 'https://i.ibb.co/S7qMhBf/m416-legendary.png' },
    { name: 'مقلاة النصر 🍳', imageUrl: 'https://i.ibb.co/3s03xS8/pan-victory.png' },
    { name: 'حقيبة ظهر القرش 🦈', imageUrl: 'https://i.ibb.co/k51fH2g/shark-backpack.png' },
    { name: 'حظاً أوفر في المرة القادمة! 😅', imageUrl: 'https://i.ibb.co/RzM3g89/better-luck.png' }
];

router.get('/lootbox', (req, res) => {
    const userName = req.query.user_name || 'مستخدم مجهول';
    const randomLoot = lootItems[Math.floor(Math.random() * lootItems.length)];

    if (randomLoot.name !== 'حظاً أوفر في المرة القادمة! 😅') {
        if (lastLooters.length >= 10) {
            lastLooters.shift();
        }
        lastLooters.push({ 
            name: userName, 
            prize: randomLoot.name,
            time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        });
    }

    res.json(randomLoot);
});

router.get('/lastlooters', (req, res) => {
    res.json(lastLooters.reverse());
});

module.exports = router;