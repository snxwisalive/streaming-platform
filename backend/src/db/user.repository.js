import { pool } from './db.js';

export const findUserByEmailOrNickname = async (login) => {
    const { rows } = await pool.query(
        `SELECT * FROM users 
         WHERE email = $1 OR nickname = $1
         LIMIT 1`,
        [login]
    );
    return rows[0];
};

export const findUserByEmail = async (email) => {
    const { rows } = await pool.query(
        `SELECT * FROM users 
         WHERE email = $1
         LIMIT 1`,
        [email]
    );
    return rows[0];
};

export const findUserByNickname = async (nickname) => {
    const { rows } = await pool.query(
        `SELECT * FROM users 
         WHERE nickname = $1
         LIMIT 1`,
        [nickname]
    );
    return rows[0];
};

/**
 * Search users by nickname (partial, case-insensitive).
 * Returns public profile fields for display in search results.
 */
export const searchUsersByNickname = async (query, limit = 20) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return [];
    }
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const pattern = `%${query.trim()}%`;
    const { rows } = await pool.query(
        `SELECT 
            u.user_id,
            u.nickname,
            u.avatar_url,
            COALESCE(COUNT(s.subscription_id), 0) as subscriber_count
         FROM users u
         LEFT JOIN subscriptions s ON u.user_id = s.channel_id
         WHERE u.is_active = true
           AND u.deleted_at IS NULL
           AND u.nickname ILIKE $1
         GROUP BY u.user_id
         ORDER BY u.nickname ASC
         LIMIT $2`,
        [pattern, safeLimit]
    );
    return rows;
};

export const getAllUsers = async () => {
    const { rows } = await pool.query(
        `SELECT 
            u.user_id, 
            u.email, 
            u.nickname, 
            u.avatar_url, 
            u.is_streamer,
            COALESCE(COUNT(s.subscription_id), 0) as subscriber_count
         FROM users u
         LEFT JOIN subscriptions s ON u.user_id = s.channel_id
         WHERE u.is_active = true
           AND u.deleted_at IS NULL
         GROUP BY u.user_id`
    );
    return rows;
};

export const getRecommendedUsersForSubscriber = async (subscriberId, limit = 10) => {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 10, 10)); // hard cap at 10

    const { rows } = await pool.query(
        `SELECT 
            u.user_id,
            u.nickname,
            u.avatar_url,
            COALESCE(COUNT(s.subscription_id), 0) as subscriber_count
         FROM users u
         LEFT JOIN subscriptions s ON u.user_id = s.channel_id
         WHERE u.is_active = true
           AND u.deleted_at IS NULL
           AND u.user_id <> $1
           AND NOT EXISTS (
              SELECT 1
              FROM subscriptions s2
              WHERE s2.subscriber_id = $1 AND s2.channel_id = u.user_id
           )
         GROUP BY u.user_id
         ORDER BY subscriber_count DESC, u.user_id DESC
         LIMIT $2`,
        [subscriberId, safeLimit]
    );

    return rows;
};

export const getUserById = async (id) => {
    const { rows } = await pool.query(
        `SELECT 
            u.user_id, 
            u.email, 
            u.nickname, 
            u.avatar_url, 
            u.banner_url, 
            u.bio, 
            u.birth_date,
            COALESCE(COUNT(s.subscription_id), 0) as subscriber_count
         FROM users u
         LEFT JOIN subscriptions s ON u.user_id = s.channel_id
         WHERE u.user_id = $1
           AND u.is_active = true
           AND u.deleted_at IS NULL
         GROUP BY u.user_id`,
        [id]
    );
    return rows[0];
};

export const updateUser = async (id, data) => {
    if (!data || Object.keys(data).length === 0) {
        return await getUserById(id);
    }

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in data) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
    }

    const query = `
        UPDATE users
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE user_id = $${idx}
        RETURNING user_id, email, nickname, avatar_url, banner_url, bio
    `;

    values.push(id);

    const { rows } = await pool.query(query, values);
    return rows[0];
};

export const createUser = async ({
                                     email,
                                     nickname,
                                     passwordHash,
                                     birthDate
                                 }) => {
    const { rows } = await pool.query(
        `INSERT INTO users (
            email,
            nickname,
            password_hash,
            birth_date,
            is_active,
            created_at,
            updated_at
        ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        RETURNING user_id, email, nickname, birth_date`,
        [email, nickname, passwordHash, birthDate]
    );

    return rows[0];
};