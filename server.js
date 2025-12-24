const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;
const DB_FILE = './messages.json';

// Fungsi Database
function loadMessages() {
    try {
        if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) { console.log("Database baru dibuat."); }
    return [];
}

function saveMessages(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.error("Gagal menyimpan ke file!"); }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let messages = loadMessages();
let onlineUsers = {}; 

// Socket.io Real-time Logic
io.on('connection', (socket) => {
    console.log('User terhubung:', socket.id);

    socket.on('join-room', (room) => {
        socket.join(room);
    });

    socket.on('send-chat', (data) => {
        const newMessage = {
            room: data.room || 'Utama',
            text: data.text,
            image: data.image,
            audio: data.audio,
            senderId: data.senderId,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        messages.push(newMessage);
        if (messages.length > 500) messages.shift();
        saveMessages(messages);

        // Kirim ke semua orang di room tersebut
        io.to(data.room).emit('new-message', newMessage);
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
    });
});

// API Tetap dipertahankan untuk load awal
app.get('/api/messages', (req, res) => {
    const room = req.query.room || 'Utama';
    res.json(messages.filter(m => m.room === room));
});

http.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
