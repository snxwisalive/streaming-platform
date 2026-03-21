import { pool } from "./db.js";

export const createStreamChatMessage = async ({ streamUserId, senderId, text }) => {
    const { rows } = await pool.query(
        `
        WITH inserted AS (
            INSERT INTO stream_chat_messages (stream_user_id, sender_id, text)
            VALUES ($1, $2, $3)
            RETURNING message_id, stream_user_id, sender_id, text, created_at
        )
        SELECT
            i.message_id,
            i.stream_user_id,
            i.sender_id AS user_id,
            u.nickname,
            i.text,
            i.created_at
        FROM inserted i
        JOIN users u ON u.user_id = i.sender_id
        `,
        [streamUserId, senderId, text]
    );

    return rows[0] || null;
};

export const getStreamChatMessages = async (streamUserId, limit = 200) => {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500));

    const { rows } = await pool.query(
        `
        SELECT *
        FROM (
            SELECT
                scm.message_id,
                scm.stream_user_id,
                scm.sender_id AS user_id,
                u.nickname,
                scm.text,
                scm.created_at
            FROM stream_chat_messages scm
            JOIN users u ON u.user_id = scm.sender_id
            WHERE scm.stream_user_id = $1
            ORDER BY scm.created_at DESC
            LIMIT $2
        ) t
        ORDER BY t.created_at ASC
        `,
        [streamUserId, safeLimit]
    );

    return rows;
};
