import { pool } from "../db/db.js";
import {
    findChatBetweenUsers,
    createChat,
    findUserChatsWithLastMessage,
    findUserChatRequests,
    acceptChatRequest,
    ignoreChatRequest,
    deleteChat
} from "../db/chat.repository.js";
import { getChatMessages } from "../db/message.repository.js";
import { getIo } from "../socket.js";

export const startChat = async (req, res) => {
    try {
        const currentUserId = req.user.user_id;
        const { targetUserId } = req.body;

        console.log("startChat called:", { currentUserId, targetUserId, body: req.body });

        if (!targetUserId) {
            return res.status(400).json({ message: "targetUserId is required" });
        }

        const validTargetUserId = Number(targetUserId);
        
        if (isNaN(validTargetUserId) || validTargetUserId <= 0) {
            return res.status(400).json({ message: "Invalid targetUserId" });
        }

        if (validTargetUserId === currentUserId) {
            return res.status(400).json({ message: "You cannot chat with yourself" });
        }

        let chat = await findChatBetweenUsers(currentUserId, validTargetUserId);

        if (!chat) {
            chat = await createChat(currentUserId, validTargetUserId, currentUserId);
        }

        getIo()?.emit("chat_data_changed", { chatId: chat.chat_id });
        res.json(chat);
    } catch (error) {
        console.error("Error in startChat:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getMyChats = async (req, res) => {
    const userId = req.user.user_id;

    const chats = await findUserChatsWithLastMessage(userId);

    res.json(chats);
};

export const getChatMessagesById = async (req, res) => {
    const userId = req.user.user_id;
    const { chatId } = req.params;

    const { rows } = await pool.query(
        `
        SELECT 1
        FROM chats
        WHERE chat_id = $1
          AND ($2 = user1_id OR $2 = user2_id)
        `,
        [chatId, userId]
    );

    if (rows.length === 0) {
        return res.status(403).json({ message: "Access denied" });
    }

    const messages = await getChatMessages(chatId);
    res.json(messages);
};

export const getMyRequests = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const requests = await findUserChatRequests(userId);
        res.json(requests);
    } catch (error) {
        console.error("Error in getMyRequests:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const acceptRequest = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const chatId = Number(req.params.chatId);
        if (!chatId || isNaN(chatId)) {
            return res.status(400).json({ message: "Invalid chat ID" });
        }
        const ok = await acceptChatRequest(chatId, userId);
        if (!ok) {
            return res.status(404).json({ message: "Request not found or already handled" });
        }
        getIo()?.emit("chat_data_changed", { chatId });
        res.json({ success: true });
    } catch (error) {
        console.error("Error in acceptRequest:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const ignoreRequest = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const chatId = Number(req.params.chatId);
        if (!chatId || isNaN(chatId)) {
            return res.status(400).json({ message: "Invalid chat ID" });
        }
        const ok = await ignoreChatRequest(chatId, userId);
        if (!ok) {
            return res.status(404).json({ message: "Request not found or already handled" });
        }
        getIo()?.emit("chat_data_changed", { chatId });
        res.json({ success: true });
    } catch (error) {
        console.error("Error in ignoreRequest:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteChatController = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const chatId = Number(req.params.chatId);
        if (!chatId || isNaN(chatId)) {
            return res.status(400).json({ message: "Invalid chat ID" });
        }
        const ok = await deleteChat(chatId, userId);
        if (!ok) {
            return res.status(404).json({ message: "Chat not found" });
        }
        getIo()?.emit("chat_data_changed", { chatId });
        res.json({ success: true });
    } catch (error) {
        console.error("Error in deleteChatController:", error);
        res.status(500).json({ message: "Server error" });
    }
};