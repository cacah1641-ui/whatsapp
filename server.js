const express = require('express');
const app = express();
const path = require('path');

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let messages = [];
let onlineUsers = {};

app.get('/api/messages', (req, res) => res.json(messages));

app.post('/api/messages', (req, res) => {
    const msg = { 
        ...req.body, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    messages.push(msg);
    if (messages.length > 100) messages.shift();
    res.status(201).json({ status: 'OK' });
});

// Perbaikan: Server sekarang mengirimkan daftar ID yang online kembali ke user
app.post('/api/heartbeat', (req, res) => {
    const { userId } = req.body;
    if (userId) onlineUsers[userId] = Date.now();
    
    const sekarang = Date.now();
    for (const id in onlineUsers) {
        if (sekarang - onlineUsers[id] > 8000) delete onlineUsers[id];
    }
    
    res.json({ 
        onlineCount: Object.keys(onlineUsers).length,
        usersOnline: Object.keys(onlineUsers) // Memberitahu klien siapa saja yang online
    });
});

app.delete('/api/messages', (req, res) => { 
    messages = []; 
    res.json({ status: 'OK' }); 
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
