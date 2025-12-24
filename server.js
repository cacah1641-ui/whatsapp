const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;
const DB_FILE = './messages.json';

function loadMessages() {
    try {
        if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) { return []; }
    return [];
}

function saveMessages(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.error("Gagal simpan file"); }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let messages = loadMessages();

io.on('connection', (socket) => {
    socket.on('join-room', (room) => socket.join(room));

    socket.on('send-chat', (data) => {
        const newMessage = {
            room: data.room || 'Utama',
            text: data.text || '',
            image: data.image || null,
            audio: data.audio || null,
            senderId: data.senderId,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        messages.push(newMessage);
        if (messages.length > 500) messages.shift();
        saveMessages(messages);

        // Kirim ke semua orang secara real-time
        io.to(data.room).emit('new-message', newMessage);
    });
});

app.get('/api/messages', (req, res) => {
    const room = req.query.room || 'Utama';
    res.json(messages.filter(m => m.room === room));
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
