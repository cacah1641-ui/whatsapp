const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Konfigurasi limit payload untuk mendukung pengiriman gambar/audio base64 yang besar
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

let messages = [];
let onlineUsers = {}; // Menyimpan timestamp terakhir aktivitas user
let socketMap = {};   // Memetakan Nama User ke ID Socket untuk fitur panggilan

// Route utama (Satu file HTML untuk semua user)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'chatting.html'));
});

// API untuk mengambil riwayat pesan
app.get('/api/messages', (req, res) => {
    res.json(messages);
});

// API untuk mengirim pesan baru
app.post('/api/messages', (req, res) => {
    const msg = { 
        ...req.body, 
        // Penanda waktu otomatis dari server
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    messages.push(msg);
    // Broadcast ke semua user bahwa ada pesan baru
    io.emit('updateMessages'); 
    res.status(201).json({ status: 'OK' });
});

// API untuk menghapus seluruh percakapan
app.post('/api/delete-chat', (req, res) => {
    messages = [];
    io.emit('updateMessages');
    res.json({ status: 'Chat Berhasil Dihapus' });
});

// API Heartbeat untuk menghitung jumlah user yang sedang online
app.post('/api/heartbeat', (req, res) => {
    const { userId } = req.body;
    if (userId) {
        onlineUsers[userId] = Date.now();
    }
    
    // Filter user yang masih aktif dalam 10 detik terakhir
    const now = Date.now();
    const activeUsers = Object.keys(onlineUsers).filter(id => (now - onlineUsers[id]) < 10000);
    
    res.json({ usersOnline: activeUsers });
});

// Koneksi Socket.io untuk fitur Real-time & WebRTC (Panggilan)
io.on('connection', (socket) => {
    
    // Mendaftarkan user ke dalam map socket
    socket.on('register', (userId) => {
        socketMap[userId] = socket.id;
        console.log(`${userId} terhubung dengan socket ID: ${socket.id}`);
    });

    // Menangani Panggilan Masuk (Broadcast ke user lain atau target spesifik)
    socket.on('panggilanMasuk', (data) => {
        // Dalam mode grup/multi-user, kita broadcast ke semua kecuali pengirim
        socket.broadcast.emit('panggilanMasuk', data);
    });

    // Menangani Jawaban Panggilan
    socket.on('panggilanDiterima', (data) => {
        const targetSocket = socketMap[data.to];
        if (targetSocket) {
            io.to(targetSocket).emit('panggilanDiterima', data);
        }
    });

    // Pertukaran Ice Candidate untuk WebRTC
    socket.on('ice-candidate', (data) => {
        // Jika ada target spesifik (data.to) kirim ke dia, jika tidak broadcast
        if (data.to) {
            const targetSocket = socketMap[data.to];
            if (targetSocket) io.to(targetSocket).emit('ice-candidate', data);
        } else {
            socket.broadcast.emit('ice-candidate', data);
        }
    });

    // Mengakhiri Panggilan
    socket.on('matikan', (data) => {
        io.emit('panggilanDimatikan');
    });

    // Pembersihan saat user diskonek
    socket.on('disconnect', () => {
        for (const userId in socketMap) {
            if (socketMap[userId] === socket.id) {
                console.log(`${userId} keluar.`);
                delete socketMap[userId];
                delete onlineUsers[userId];
                break;
            }
        }
    });
});

// Jalankan Server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(`Server WhatsApp Clone Berhasil Dijalankan!`);
    console.log(`Akses di: http://localhost:${PORT}`);
    console.log(`==========================================`);
});
