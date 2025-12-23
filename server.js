const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

const DB_FILE = './messages.json';

// Load pesan dari memori permanen
function loadMessages() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch (e) { console.error("Database baru dibuat."); }
    return [];
}

// Simpan pesan ke memori permanen
function saveMessages(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.error("Gagal menyimpan!"); }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let messages = loadMessages();
let onlineUsers = {}; 

app.get('/api/messages', (req, res) => {
    const room = req.query.room || 'Utama';
    res.json(messages.filter(m => m.room === room));
});

app.post('/api/messages', (req, res) => {
    const { room, text, image, audio, senderId, reply } = req.body;
    const newMessage = {
        room: room || 'Utama',
        text, image, audio, senderId, reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    messages.push(newMessage);
    if (messages.length > 500) messages.shift();
    saveMessages(messages);
    res.status(201).json({ status: 'OK' });
});

app.post('/api/heartbeat', (req, res) => {
    const { userId, room } = req.body;
    onlineUsers[userId] = { room, lastSeen: Date.now() };
    const now = Date.now();
    const count = Object.values(onlineUsers).filter(u => 
        u.room === room && (now - u.lastSeen) < 10000
    ).length;
    res.json({ onlineCount: count });
});

app.delete('/api/messages', (req, res) => {
    const room = req.query.room;
    messages = messages.filter(m => m.room !== room);
    saveMessages(messages);
    res.json({ status: 'Deleted' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server aktif di http://localhost:${PORT}`));
