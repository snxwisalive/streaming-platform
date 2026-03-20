import { pool } from './db.js';

export const subscribe = async (subscriberId, channelId) => {
    const { rows } = await pool.query(
        `INSERT INTO subscriptions (subscriber_id, channel_id)
         VALUES ($1, $2)
         ON CONFLICT (subscriber_id, channel_id) DO NOTHING
         RETURNING subscription_id, subscriber_id, channel_id, created_at`,
        [subscriberId, channelId]
    );

    return rows[0] || null;
};

export const unsubscribe = async (subscriberId, channelId) => {
    const { rows } = await pool.query(
        `DELETE FROM subscriptions
         WHERE subscriber_id = $1 AND channel_id = $2
         RETURNING subscription_id`,
        [subscriberId, channelId]
    );

    return rows[0] || null;
};

export const isSubscribed = async (subscriberId, channelId) => {
    const { rows } = await pool.query(
        `SELECT subscription_id
         FROM subscriptions
         WHERE subscriber_id = $1 AND channel_id = $2`,
        [subscriberId, channelId]
    );

    return !!rows[0];
};

export const getUserSubscriptions = async (subscriberId) => {
    const { rows } = await pool.query(
        `SELECT 
            s.channel_id,
            u.nickname,
            u.avatar_url
         FROM subscriptions s
         JOIN users u ON s.channel_id = u.user_id
         WHERE s.subscriber_id = $1
           AND u.is_active = true
           AND u.deleted_at IS NULL
         ORDER BY s.created_at DESC`,
        [subscriberId]
    );

    return rows;
};

export const getSubscribedVideos = async (subscriberId, limit = 20, offset = 0) => {
    const { rows } = await pool.query(
        `SELECT 
            v.video_id, v.user_id, v.title, v.description,
            v.thumbnail_url, v.duration, v.views_count, v.created_at,
            u.nickname, u.avatar_url
         FROM videos v
         JOIN subscriptions s ON v.user_id = s.channel_id
         JOIN users u ON v.user_id = u.user_id
         WHERE s.subscriber_id = $1
           AND u.is_active = true
           AND u.deleted_at IS NULL
           AND v.is_public = true
           AND v.is_active = true
         ORDER BY v.created_at DESC
         LIMIT $2 OFFSET $3`,
        [subscriberId, limit, offset]
    );

    return rows;
};

export const removeSubscriptionsByUserId = async (userId) => {
    const { rowCount } = await pool.query(
        `
        DELETE FROM subscriptions
        WHERE subscriber_id = $1
           OR channel_id = $1
        `,
        [userId]
    );

    return rowCount;
};

