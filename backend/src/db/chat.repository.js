import { pool } from "./db.js";

export const findChatBetweenUsers = async (user1Id, user2Id) => {
    const user1 = Math.min(user1Id, user2Id);
    const user2 = Math.max(user1Id, user2Id);

    const { rows } = await pool.query(
        `
        SELECT *
        FROM chats
        WHERE user1_id = $1 AND user2_id = $2
        `,
        [user1, user2]
    );

    return rows[0] || null;
};

export const createChat = async (user1Id, user2Id, requestedById) => {
    const user1 = Math.min(user1Id, user2Id);
    const user2 = Math.max(user1Id, user2Id);
    const requestedBy = requestedById != null ? requestedById : user2;

    const { rows } = await pool.query(
        `
        INSERT INTO chats (user1_id, user2_id, requested_by_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *
        `,
        [user1, user2, requestedBy]
    );

    return rows[0];
};

export const findUserChatsWithLastMessage = async userId => {
    const { rows } = await pool.query(
        `
        SELECT
            c.chat_id,
            u.user_id,
            CASE
                WHEN u.user_id IS NULL OR u.deleted_at IS NOT NULL OR u.is_active = false THEN 'Deleted user'
                ELSE u.nickname
            END AS nickname,
            CASE
                WHEN u.user_id IS NULL OR u.deleted_at IS NOT NULL OR u.is_active = false THEN NULL
                ELSE u.avatar_url
            END AS avatar_url,
            m.text AS last_message,
            m.created_at AS last_message_at
        FROM chats c
        LEFT JOIN users u
          ON u.user_id = CASE
              WHEN c.user1_id = $1 THEN c.user2_id
              ELSE c.user1_id
          END
        LEFT JOIN LATERAL (
            SELECT text, created_at
            FROM messages
            WHERE chat_id = c.chat_id
            ORDER BY created_at DESC
            LIMIT 1
        ) m ON true
        WHERE (c.user1_id = $1 OR c.user2_id = $1)
          AND (c.status = 'approved' OR c.status IS NULL OR c.requested_by_id = $1)
        ORDER BY m.created_at DESC NULLS FIRST
        `,
        [userId]
    );

    return rows;
};

/** Chats where I am the recipient of a pending request (requested_by_id != me). */
export const findUserChatRequests = async userId => {
    const { rows } = await pool.query(
        `
        SELECT
            c.chat_id,
            u.user_id,
            CASE
                WHEN u.user_id IS NULL OR u.deleted_at IS NOT NULL OR u.is_active = false THEN 'Deleted user'
                ELSE u.nickname
            END AS nickname,
            CASE
                WHEN u.user_id IS NULL OR u.deleted_at IS NOT NULL OR u.is_active = false THEN NULL
                ELSE u.avatar_url
            END AS avatar_url,
            m.text AS last_message,
            m.created_at AS last_message_at
        FROM chats c
        LEFT JOIN users u
          ON u.user_id = CASE
              WHEN c.user1_id = $1 THEN c.user2_id
              ELSE c.user1_id
          END
        LEFT JOIN LATERAL (
            SELECT text, created_at
            FROM messages
            WHERE chat_id = c.chat_id
            ORDER BY created_at DESC
            LIMIT 1
        ) m ON true
        WHERE (c.user1_id = $1 OR c.user2_id = $1)
          AND c.status = 'pending'
          AND c.requested_by_id IS NOT NULL
          AND c.requested_by_id <> $1
        ORDER BY m.created_at DESC NULLS FIRST
        `,
        [userId]
    );

    return rows;
};

export const acceptChatRequest = async (chatId, userId) => {
    const { rowCount } = await pool.query(
        `
        UPDATE chats
        SET status = 'approved'
        WHERE chat_id = $1
          AND (user1_id = $2 OR user2_id = $2)
          AND status = 'pending'
          AND requested_by_id IS NOT NULL
          AND requested_by_id <> $2
        `,
        [chatId, userId]
    );
    return rowCount > 0;
};

export const ignoreChatRequest = async (chatId, userId) => {
    const { rowCount } = await pool.query(
        `
        DELETE FROM chats
        WHERE chat_id = $1
          AND (user1_id = $2 OR user2_id = $2)
          AND status = 'pending'
          AND requested_by_id <> $2
        `,
        [chatId, userId]
    );
    return rowCount > 0;
};

/** Delete a chat (and its messages via cascade) for a participant. */
export const deleteChat = async (chatId, userId) => {
    const { rowCount } = await pool.query(
        `
        DELETE FROM chats
        WHERE chat_id = $1
          AND (user1_id = $2 OR user2_id = $2)
        `,
        [chatId, userId]
    );
    return rowCount > 0;
};