import dotenv from 'dotenv';
import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { verifyToken } from './utils/auth.utils.js';
import { createStreamChatMessage } from './db/streamChat.repository.js';

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

    socket.on("stream_chat_message", async ({ streamUserId, text, token }) => {
        try {
            const parsedStreamUserId = Number(streamUserId);
            const trimmed = String(text || "").trim();

            if (!parsedStreamUserId || Number.isNaN(parsedStreamUserId)) return;
            if (!trimmed) return;
            if (!token) return;

            const decoded = verifyToken(token);
            const senderId = Number(decoded?.user_id);
            if (!senderId || Number.isNaN(senderId)) return;

            const msg = await createStreamChatMessage({
                streamUserId: parsedStreamUserId,
                senderId,
                text: trimmed.slice(0, 500),
            });

            if (msg) {
                io.to(`stream_${parsedStreamUserId}`).emit("stream_chat_message", msg);
            }
        } catch (error) {
            console.error("stream_chat_message error:", error.message);
        }
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