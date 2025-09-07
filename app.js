const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'sensitivities.json');

app.use(cors());
app.use(express.json());

// دالة لقراءة البيانات من ملف JSON
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to read data file:', error);
        return [];
    }
}

// دالة لكتابة البيانات إلى ملف JSON
async function writeData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to write data file:', error);
    }
}

// API لجلب جميع الحساسيات
app.get('/api/sensitivities', async (req, res) => {
    const data = await readData();
    res.json(data);
});

// API لإضافة حساسية جديدة
app.post('/api/sensitivities', async (req, res) => {
    const data = await readData();
    const newSensitivity = { 
        id: data.length > 0 ? Math.max(...data.map(s => s.id)) + 1 : 1,
        ...req.body 
    };
    data.push(newSensitivity);
    await writeData(data);
    res.status(201).json(newSensitivity);
});

// API لحذف حساسية
app.delete('/api/sensitivities/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const data = await readData();
    const filteredData = data.filter(s => s.id !== id);
    if (filteredData.length === data.length) {
        return res.status(404).json({ message: 'Sensitivity not found' });
    }
    await writeData(filteredData);
    res.json({ message: 'Sensitivity deleted successfully' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});