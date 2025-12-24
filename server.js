const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;
const DB_FILE = './messages.json';

// Fungsi Database (Simpan ke File)
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

// Logika Socket.io (Real-time)
io.on('connection', (socket) => {
    console.log('User terhubung');

    socket.on('join-room', (room) => {
        socket.join(room);
    });

    socket.on('send-chat', (data) => {
        const newMessage = {
            room: data.room || 'Utama',
            text: data.text,
            senderId: data.senderId,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        messages.push(newMessage);
        if (messages.length > 500) messages.shift();
        saveMessages(messages);

        // Kirim ke semua orang di room secara instan
        io.to(data.room).emit('new-message', newMessage);
    });
});

// API untuk Load Chat Awal
app.get('/api/messages', (req, res) => {
    const room = req.query.room || 'Utama';
    res.json(messages.filter(m => m.room === room));
});

// Jalankan Server
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
