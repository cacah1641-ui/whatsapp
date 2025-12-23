const express = require('express');
const app = express();
const path = require('path');

// PENTING: Naikkan limit ke 50mb agar bisa kirim gambar & audio base64
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let messages = [];
let onlineUsers = {}; 

// API Ambil Pesan
app.get('/api/messages', (req, res) => {
    const room = req.query.room || 'Utama';
    res.json(messages.filter(m => m.room === room));
});

// API Kirim Pesan (Mendukung Text, Image, Audio, dan Reply)
app.post('/api/messages', (req, res) => {
    const { room, text, image, audio, senderId, reply } = req.body;
    
    const newMessage = {
        room: room || 'Utama',
        text,
        image,  
        audio,  
        senderId,
        reply, // Data balasan pesan
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    messages.push(newMessage);
    if (messages.length > 200) messages.shift(); // Batasi 200 pesan di memori
    
    res.status(201).json({ status: 'OK' });
});

// API Status Online
app.post('/api/heartbeat', (req, res) => {
    const { userId, room } = req.body;
    onlineUsers[userId] = { room, lastSeen: Date.now() };
    const now = Date.now();
    const count = Object.values(onlineUsers).filter(u => u.room === room && (now - u.lastSeen) < 10000).length;
    res.json({ onlineCount: count });
});

// API Hapus Chat
app.delete('/api/messages', (req, res) => {
    const room = req.query.room;
    messages = messages.filter(m => m.room !== room);
    res.json({ status: 'Deleted' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});