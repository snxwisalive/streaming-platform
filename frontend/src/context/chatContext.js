import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { fetchAPI } from "../services/api";
import { authService } from "../services/authService";

const ChatContext = createContext();

const SOCKET_URL = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";

export const ChatProvider = ({ children }) => {
  const [socket,        setSocket       ] = useState(null);
  const [chats,         setChats        ] = useState([]);
  const [requests,      setRequests     ] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages,      setMessages     ] = useState([]);
  const [isChatOpen,    setIsChatOpen   ] = useState(false);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (!currentUser) return;
    const s = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    setSocket(s);
    return () => s.disconnect();
  }, [currentUser?.user_id]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => {
      if (msg.chat_id === currentChatId) {
        setMessages((prev) => [...prev, msg]);
      }
      setChats((prev) =>
        prev.map((c) => c.chat_id === msg.chat_id
          ? { ...c, last_message: msg.text, last_message_at: msg.created_at }
          : c)
      );
      setRequests((prev) =>
        prev.map((r) => r.chat_id === msg.chat_id
          ? { ...r, last_message: msg.text, last_message_at: msg.created_at }
          : r)
      );
    };
    socket.on("new_message", handleNewMessage);
    return () => socket.off("new_message", handleNewMessage);
  }, [socket, currentChatId]);

  /* ВАЖЛИВО: listener тут видалено —
     toggle обробляється лише в FloatingChatButton,
     щоб уникнути подвійного спрацьовування */

  const loadChats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI("/chats/my");
      setChats(data);
    } catch (err) {
      console.error("Failed to load chats", err);
    }
  }, [currentUser?.user_id]);

  const loadRequests = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAPI("/chats/requests");
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load requests", err);
      setRequests([]);
    }
  }, [currentUser?.user_id]);

  // Refresh REST-backed lists (chats/requests) after server-side changes.
  useEffect(() => {
    if (!socket) return;

    const handleChatDataChanged = async ({ chatId } = {}) => {
      try {
        await loadChats();
        await loadRequests();

        // If this chat is currently opened, refresh full message history.
        if (chatId && currentChatId && String(chatId) === String(currentChatId)) {
          const data = await fetchAPI(`/chats/${chatId}/messages`);
          setMessages(data);
        }
      } catch (err) {
        console.error("Failed to refresh chat data", err);
      }
    };

    socket.on("chat_data_changed", handleChatDataChanged);
    return () => socket.off("chat_data_changed", handleChatDataChanged);
  }, [socket, currentChatId, loadChats, loadRequests]);

  const acceptRequest = useCallback(async (chatId) => {
    try {
      await fetchAPI(`/chats/${chatId}/accept`, { method: "POST" });
      await loadChats();
      await loadRequests();
    } catch (err) {
      console.error("Failed to accept request", err);
      throw err;
    }
  }, [loadChats, loadRequests]);

  const ignoreRequest = useCallback(async (chatId) => {
    try {
      await fetchAPI(`/chats/${chatId}/ignore`, { method: "POST" });
      await loadRequests();
    } catch (err) {
      console.error("Failed to ignore request", err);
      throw err;
    }
  }, [loadRequests]);

  const deleteChat = useCallback(async (chatId) => {
    try {
      await fetchAPI(`/chats/${chatId}`, { method: "DELETE" });
      await loadChats();
    } catch (err) {
      console.error("Failed to delete chat", err);
      throw err;
    }
  }, [loadChats]);

  const openChat = useCallback(async (chatId) => {
    try {
      setCurrentChatId(chatId);
      setIsChatOpen(true);

      // Join room after state update to avoid missing real-time events during initial fetch.
      if (socket) socket.emit("join_chat", chatId);

      const data = await fetchAPI(`/chats/${chatId}/messages`);
      setMessages(data);
    } catch (err) {
      console.error("Failed to open chat", err);
    }
  }, [socket]);

  const closeChat = useCallback(() => {
    setCurrentChatId(null);
    setMessages([]);
    setIsChatOpen(false);
  }, []);

  const sendMessage = useCallback((chatId, text) => {
    if (!socket || !currentUser) return;
    socket.emit("send_message", { chatId, senderId: currentUser.user_id, text });
  }, [socket, currentUser?.user_id]);

  const startNewChat = useCallback(async (targetUserId) => {
    if (!currentUser) return;
    const validTargetUserId = Number(targetUserId);
    if (!validTargetUserId || isNaN(validTargetUserId)) {
      console.error("Invalid targetUserId:", targetUserId);
      throw new Error("Invalid user ID");
    }
    try {
      const chat = await fetchAPI("/chats/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: validTargetUserId }),
      });
      await loadChats();
      await openChat(chat.chat_id);
      return chat;
    } catch (err) {
      console.error("Failed to start chat", err);
      throw err;
    }
  }, [currentUser?.user_id, loadChats, openChat]);

  return (
    <ChatContext.Provider value={{
      socket,
      chats, requests,
      isChatOpen, setIsChatOpen,
      loadChats, loadRequests,
      acceptRequest, ignoreRequest, deleteChat,
      currentChatId,
      openChat, closeChat,
      messages, sendMessage,
      startNewChat,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);