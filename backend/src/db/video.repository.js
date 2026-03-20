import { pool } from './db.js';

export const createVideo = async ({
    userId,
    title,
    description,
    videoUrl,
    thumbnailUrl,
    duration,
    fileSize,
    mimeType,
    isPublic = true,
    tags = []
}) => {
    const { rows } = await pool.query(
        `INSERT INTO videos (
            user_id,
            title,
            description,
            video_url,
            thumbnail_url,
            duration,
            file_size,
            mime_type,
            is_public,
            status,
            created_at,
            updated_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,'ready',NOW(),NOW()
        )
        RETURNING
            video_id,
            user_id,
            title,
            description,
            video_url,
            thumbnail_url,
            duration,
            views_count,
            is_public,
            created_at`,
        [
            userId,
            title,
            description,
            videoUrl,
            thumbnailUrl,
            duration,
            fileSize,
            mimeType,
            isPublic
        ]
    );

    const video = rows[0];

    // Add tags if provided
    if (tags && tags.length > 0) {
        await addTagsToVideo(video.video_id, tags);
        video.tags = await getVideoTags(video.video_id);
    } else {
        video.tags = [];
    }

    return video;
};

export const getVideoById = async (videoId) => {
    const { rows } = await pool.query(
        `SELECT 
            v.video_id,
            v.user_id,
            v.title,
            v.description,
            v.video_url,
            v.thumbnail_url,
            v.duration,
            v.mime_type,
            v.views_count,
            v.is_public,
            v.created_at,
            u.nickname,
            u.avatar_url
         FROM videos v
         JOIN users u ON v.user_id = u.user_id
         WHERE v.video_id = $1
           AND v.is_active = true
           AND u.is_active = true
           AND u.deleted_at IS NULL`,
        [videoId]
    );

    if (rows.length === 0) {
        return null;
    }

    const video = rows[0];
    video.tags = await getVideoTags(videoId);
    return video;
};

export const getUserVideos = async (userId, includePrivate = false) => {
    let query = `
        SELECT 
            v.video_id, v.user_id, v.title, v.description, v.video_url, 
            v.thumbnail_url, v.duration, v.views_count, 
            v.is_public, v.created_at,
            u.nickname, u.avatar_url
        FROM videos v
        JOIN users u ON v.user_id = u.user_id
        WHERE v.user_id = $1
          AND v.is_active = true
          AND u.is_active = true
          AND u.deleted_at IS NULL
    `;

    if (!includePrivate) {
        query += ' AND v.is_public = true';
    }

    query += ' ORDER BY v.created_at DESC';

    const { rows } = await pool.query(query, [userId]);
    
    // Add tags to each video
    const videosWithTags = await Promise.all(
        rows.map(async (video) => {
            video.tags = await getVideoTags(video.video_id);
            return video;
        })
    );

    return videosWithTags;
};

export const getAllPublicVideos = async (limit = 20, offset = 0) => {
    const { rows } = await pool.query(
        `SELECT 
            v.video_id, v.user_id, v.title, v.description, 
            v.thumbnail_url, v.duration, v.views_count, v.created_at,
            u.nickname, u.avatar_url
         FROM videos v
         JOIN users u ON v.user_id = u.user_id
         WHERE v.is_public = true
           AND v.is_active = true
           AND u.is_active = true
           AND u.deleted_at IS NULL
         ORDER BY v.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );

    // Add tags to each video
    const videosWithTags = await Promise.all(
        rows.map(async (video) => {
            video.tags = await getVideoTags(video.video_id);
            return video;
        })
    );

    return videosWithTags;
};

export const incrementViewCount = async (videoId) => {
    const { rows } = await pool.query(
        `UPDATE videos 
         SET views_count = views_count + 1 
         WHERE video_id = $1 
         RETURNING views_count`,
        [videoId]
    );

    return rows[0];
};

export const updateVideo = async (videoId, userId, data) => {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowedFields = ['title', 'description', 'thumbnail_url', 'is_public'];

    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            fields.push(`${key} = $${idx++}`);
            values.push(data[key]);
        }
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    values.push(videoId, userId);

    const query = `
        UPDATE videos
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE video_id = $${idx} AND user_id = $${idx + 1}
        RETURNING video_id, title, description, thumbnail_url, is_public
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
};

export const deleteVideo = async (videoId, userId) => {
    const { rows } = await pool.query(
        `UPDATE videos 
         SET is_active = false 
         WHERE video_id = $1 AND user_id = $2
         RETURNING video_id`,
        [videoId, userId]
    );

    return rows[0];
};

export const recordVideoView = async (videoId, userId = null, ipAddress = null, watchDuration = 0) => {
    const { rows } = await pool.query(
        `INSERT INTO video_views (video_id, user_id, ip_address, watch_duration, viewed_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING view_id`,
        [videoId, userId, ipAddress, watchDuration]
    );

    return rows[0];
};

// Tag-related functions
export const getOrCreateTag = async (tagName) => {
    // Normalize tag name (lowercase, trim)
    const normalizedName = tagName.trim().toLowerCase();
    
    // Try to get existing tag
    let { rows } = await pool.query(
        `SELECT tag_id, name FROM tags WHERE name = $1`,
        [normalizedName]
    );

    if (rows.length > 0) {
        return rows[0];
    }

    // Create new tag if it doesn't exist
    const result = await pool.query(
        `INSERT INTO tags (name) VALUES ($1) RETURNING tag_id, name`,
        [normalizedName]
    );

    return result.rows[0];
};

export const addTagsToVideo = async (videoId, tagNames) => {
    if (!tagNames || tagNames.length === 0) {
        return [];
    }

    const tagIds = [];
    
    // Get or create all tags
    for (const tagName of tagNames) {
        const tag = await getOrCreateTag(tagName);
        tagIds.push(tag.tag_id);
    }

    // Insert video-tag relationships (ignore duplicates)
    const insertPromises = tagIds.map(tagId =>
        pool.query(
            `INSERT INTO video_tags (video_id, tag_id) 
             VALUES ($1, $2) 
             ON CONFLICT (video_id, tag_id) DO NOTHING`,
            [videoId, tagId]
        )
    );

    await Promise.all(insertPromises);

    // Return the tags that were added
    const { rows } = await pool.query(
        `SELECT t.tag_id, t.name 
         FROM tags t
         JOIN video_tags vt ON t.tag_id = vt.tag_id
         WHERE vt.video_id = $1`,
        [videoId]
    );

    return rows;
};

export const replaceVideoTags = async (videoId, tagNames) => {
    // Удаляем все старые теги
    await pool.query(`DELETE FROM video_tags WHERE video_id = $1`, [videoId]);
    
    if (!tagNames || tagNames.length === 0) return [];
    
    return addTagsToVideo(videoId, tagNames);
};

export const getVideoTags = async (videoId) => {
    const { rows } = await pool.query(
        `SELECT t.tag_id, t.name 
         FROM tags t
         JOIN video_tags vt ON t.tag_id = vt.tag_id
         WHERE vt.video_id = $1
         ORDER BY t.name`,
        [videoId]
    );

    return rows;
};

export const getPopularTags = async (limit = 10) => {
    const { rows } = await pool.query(
        `SELECT t.tag_id, t.name, COUNT(vt.video_id)::int AS video_count
         FROM tags t
         JOIN video_tags vt ON t.tag_id = vt.tag_id
         JOIN videos v ON v.video_id = vt.video_id AND v.is_public = true AND v.is_active = true
         JOIN users u ON v.user_id = u.user_id AND u.is_active = true AND u.deleted_at IS NULL
         GROUP BY t.tag_id, t.name
         ORDER BY video_count DESC, t.name
         LIMIT $1`,
        [Math.min(Math.max(1, limit), 50)]
    );
    return rows;
};

export const searchVideos = async (searchQuery, limit = 20, offset = 0) => {
    if (!searchQuery || searchQuery.trim().length === 0) {
        return getAllPublicVideos(limit, offset);
    }

    const searchTerm = `%${searchQuery.trim().toLowerCase()}%`;
    
    // Search by video title (using trigram similarity) OR by tag names
    const { rows } = await pool.query(
        `SELECT DISTINCT
            v.video_id, 
            v.user_id, 
            v.title, 
            v.description, 
            v.thumbnail_url, 
            v.duration, 
            v.views_count, 
            v.created_at,
            u.nickname, 
            u.avatar_url,
            GREATEST(
                similarity(LOWER(v.title), LOWER($1)),
                COALESCE(MAX(similarity(LOWER(t.name), LOWER($1))), 0)
            ) as relevance
         FROM videos v
         JOIN users u ON v.user_id = u.user_id
         LEFT JOIN video_tags vt ON v.video_id = vt.video_id
         LEFT JOIN tags t ON vt.tag_id = t.tag_id
         WHERE v.is_public = true 
           AND v.is_active = true
           AND u.is_active = true
           AND u.deleted_at IS NULL
           AND (
               similarity(LOWER(v.title), LOWER($1)) > 0.1
               OR similarity(LOWER(t.name), LOWER($1)) > 0.1
           )
         GROUP BY v.video_id, v.user_id, v.title, v.description, 
                  v.thumbnail_url, v.duration, v.views_count, 
                  v.created_at, u.nickname, u.avatar_url
         ORDER BY relevance DESC, v.created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchQuery.trim(), limit, offset]
    );

    // Add tags to each video
    const videosWithTags = await Promise.all(
        rows.map(async (video) => {
            video.tags = await getVideoTags(video.video_id);
            return video;
        })
    );

    return videosWithTags;
};