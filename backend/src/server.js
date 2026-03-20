import dotenv from 'dotenv';
import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { setIo } from './socket.js';
import { startDeleteAccountsCron } from './cron/deleteAccounts.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

setIo(io);

startDeleteAccountsCron();

io.on("connection", (socket) => {
    console.log("Новий користувач підключився:", socket.id);

    /* ── Private chats ── */
    socket.on("join_chat", (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`Socket ${socket.id} приєднався до chat_${chatId}`);
    });

    socket.on("send_message", async ({ chatId, senderId, text }) => {
        const message = await import("./db/message.repository.js").then(mod =>
            mod.createMessage({ chatId, senderId, text })
        );

        io.to(`chat_${chatId}`).emit("new_message", message);
        // Make sure chat lists/requests update even if recipients didn't open the room yet.
        io.emit("chat_data_changed", { chatId });
    });

    /* ── Stream chat (in-memory, no DB) ── */
    socket.on("join_stream_chat", (streamUserId) => {
        const room = `stream_${streamUserId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined stream chat ${room}`);
    });

    socket.on("leave_stream_chat", (streamUserId) => {
        socket.leave(`stream_${streamUserId}`);
    });

    socket.on("stream_chat_message", ({ streamUserId, nickname, text }) => {
        if (!text || !text.trim()) return;
        const msg = {
            id: `${socket.id}_${Date.now()}`,
            nickname: nickname || "Анонім",
            text: text.trim().slice(0, 500),
            timestamp: Date.now(),
        };
        io.to(`stream_${streamUserId}`).emit("stream_chat_message", msg);
    });

    socket.on("disconnect", () => {
        console.log("Користувач відключився:", socket.id);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

export { io };