import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { authService } from "../../services/authService";
import { fetchAPI } from "../../services/api";
import { useChat } from "../../context/chatContext";
import "../../styles/StreamChat.css";

const SOCKET_URL = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";

export default function StreamChat({ streamUserId }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [nickMenu, setNickMenu] = useState(null);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const menuRef = useRef(null);
    const currentUser = authService.getCurrentUser();
    const navigate = useNavigate();
    const { startNewChat } = useChat();

    useEffect(() => {
        let cancelled = false;

        const loadHistory = async () => {
            try {
                const data = await fetchAPI(`/streams/${streamUserId}/chat/messages?limit=200`, { method: "GET" });
                if (!cancelled) {
                    setMessages(Array.isArray(data?.messages) ? data.messages : []);
                }
            } catch (err) {
                if (!cancelled) setMessages([]);
            }
        };

        loadHistory();
        return () => { cancelled = true; };
    }, [streamUserId]);

    useEffect(() => {
        const s = io(SOCKET_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });
        socketRef.current = s;

        s.emit("join_stream_chat", streamUserId);

        s.on("stream_chat_message", (msg) => {
            setMessages((prev) => {
                const next = [...prev, msg];
                return next.slice(-200);
            });
        });

        return () => {
            s.emit("leave_stream_chat", streamUserId);
            s.disconnect();
        };
    }, [streamUserId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setNickMenu(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNickClick = (msg, event) => {
        if (!msg?.user_id) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setNickMenu({
            userId: msg.user_id,
            nickname: msg.nickname,
            top: rect.bottom + 6,
            left: rect.left,
        });
    };

    const handleStartPrivateChat = async () => {
        if (!nickMenu?.userId) return;
        try {
            await startNewChat(nickMenu.userId);
            setNickMenu(null);
        } catch (err) {
            console.error("Failed to start private chat", err);
        }
    };

    const handleGoToChannel = () => {
        if (!nickMenu?.userId) return;
        navigate(`/profile/${nickMenu.userId}`);
        setNickMenu(null);
    };

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed || !socketRef.current) return;

        socketRef.current.emit("stream_chat_message", {
            streamUserId,
            text: trimmed,
            token: authService.getToken(),
        });
        setText("");
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="stream-chat">
            <div className="stream-chat__header">
                <span className="stream-chat__header-title">Чат стріму</span>
            </div>

            <div className="stream-chat__messages">
                {messages.length === 0 && (
                    <p className="stream-chat__empty">Поки що немає повідомлень. Напишіть перше!</p>
                )}
                {messages.map((msg) => (
                    <div key={msg.message_id || msg.id} className="stream-chat__msg">
                        <button
                            type="button"
                            className="stream-chat__msg-nick"
                            onClick={(e) => handleNickClick(msg, e)}
                        >
                            {msg.nickname}
                        </button>
                        <span className="stream-chat__msg-text">{msg.text}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {nickMenu && (
                <div
                    ref={menuRef}
                    className="stream-chat__nick-menu"
                    style={{ top: nickMenu.top, left: nickMenu.left }}
                >
                    <div className="stream-chat__nick-menu-title">{nickMenu.nickname}</div>
                    {currentUser?.user_id !== nickMenu.userId && (
                        <button type="button" className="stream-chat__nick-menu-item" onClick={handleStartPrivateChat}>
                            Написати повідомлення
                        </button>
                    )}
                    <button type="button" className="stream-chat__nick-menu-item" onClick={handleGoToChannel}>
                        Перейти на канал
                    </button>
                </div>
            )}

            <div className="stream-chat__input-wrap">
                {currentUser ? (
                    <>
                        <input
                            className="stream-chat__input"
                            type="text"
                            placeholder="Написати в чат…"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            maxLength={500}
                        />
                        <button
                            className="stream-chat__send-btn"
                            onClick={handleSend}
                            disabled={!text.trim()}
                        >
                            ➤
                        </button>
                    </>
                ) : (
                    <p className="stream-chat__login-hint">Увійдіть, щоб писати в чат</p>
                )}
            </div>
        </div>
    );
}
