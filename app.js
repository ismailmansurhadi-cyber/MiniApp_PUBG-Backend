const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'sensitivities.json');

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

// مسار لجلب جميع الحساسيات
app.get('/api/sensitivities', async (req, res) => {
    const data = await readData();
    res.json(data);
});

// مسار لإضافة حساسية جديدة
app.post('/api/sensitivities/:type', async (req, res) => {
    const { name, code, imageUrl } = req.body;
    const type = req.params.type;
    const data = await readData();

    // تحقق من وجود النوع
    if (!data[type]) {
        return res.status(400).json({ error: 'Invalid sensitivity type' });
    }

    const newSensitivity = {
        id: Date.now().toString(), // إنشاء ID فريد
        name,
        code,
        imageUrl,
        type
    };

    data[type].push(newSensitivity);
    await writeData(data);
    res.status(201).json(newSensitivity);
});

// مسار لتحديث حساسية موجودة
app.put('/api/sensitivities/:id', async (req, res) => {
    const { id } = req.params;
    const { name, code, imageUrl, type } = req.body;
    const data = await readData();

    let updated = false;

    // البحث عن الحساسية في كلا النوعين
    for (const key in data) {
        const index = data[key].findIndex(item => item.id === id);
        if (index !== -1) {
            data[key][index] = { ...data[key][index], name, code, imageUrl, type };
            // إذا كان النوع قد تغير، نقل الحساسية إلى النوع الجديد
            if (key !== type) {
                const itemToMove = data[key].splice(index, 1)[0];
                data[type].push(itemToMove);
            }
            updated = true;
            break;
        }
    }

    if (updated) {
        await writeData(data);
        res.json({ message: 'Sensitivity updated successfully' });
    } else {
        res.status(404).json({ error: 'Sensitivity not found' });
    }
});

// مسار لحذف حساسية
app.delete('/api/sensitivities/:id', async (req, res) => {
    const { id } = req.params;
    const data = await readData();

    let deleted = false;
    for (const key in data) {
        const initialLength = data[key].length;
        data[key] = data[key].filter(item => item.id !== id);
        if (data[key].length < initialLength) {
            deleted = true;
            break;
        }
    }

    if (deleted) {
        await writeData(data);
        res.json({ message: 'Sensitivity deleted successfully' });
    } else {
        res.status(404).json({ error: 'Sensitivity not found' });
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});