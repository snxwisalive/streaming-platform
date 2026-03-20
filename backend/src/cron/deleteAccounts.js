import fs from "fs/promises";
import path from "path";
import { pool } from "../db/db.js";

const UPLOADS_ROOT = () => path.join(process.cwd(), "uploads");

function fileBasename(maybeUrl) {
    if (!maybeUrl) return null;
    // Support both absolute URLs (/uploads/...) and already-relative paths.
    try {
        const u = new URL(maybeUrl, "http://localhost");
        return path.basename(u.pathname);
    } catch {
        // Fallback: just take the basename.
        return path.basename(String(maybeUrl));
    }
}

async function safeUnlink(filePath) {
    try {
        await fs.unlink(filePath);
    } catch {
        // Ignore missing/permission errors per spec (try/catch per file).
    }
}

export function startDeleteAccountsCron() {
    // Lazy-load `node-cron` so the app can still run even if the dependency
    // isn't installed yet.
    import("node-cron")
        .then(({ default: cron }) => {
            // Every day at 03:00.
            cron.schedule("0 3 * * *", async () => {
                console.log("[cron] deleteAccounts job started");
                const clientUsers = await pool.query(
                    `
                    SELECT user_id, avatar_url, banner_url
                    FROM users
                    WHERE deleted_at IS NOT NULL
                      AND deletion_scheduled_at IS NOT NULL
                      AND deletion_scheduled_at < NOW()
                    `
                );

                const users = Array.isArray(clientUsers?.rows) ? clientUsers.rows : [];
                console.log(`[cron] users to delete: ${users.length}`);

                for (const u of users) {
                    const userId = u.user_id;
                    const uploadsRoot = UPLOADS_ROOT();

                    try {
                        // Videos + thumbnails
                        const { rows: videos } = await pool.query(
                            `SELECT video_url, thumbnail_url FROM videos WHERE user_id = $1`,
                            [userId]
                        );

                        for (const v of videos || []) {
                            const videoBase = fileBasename(v.video_url);
                            if (videoBase) {
                                await safeUnlink(path.join(uploadsRoot, "videos", videoBase));
                            }

                            const thumbBase = fileBasename(v.thumbnail_url);
                            if (thumbBase) {
                                await safeUnlink(path.join(uploadsRoot, "thumbnails", thumbBase));
                            }
                        }

                        // Avatar + banner
                        const avatarBase = fileBasename(u.avatar_url);
                        if (avatarBase) {
                            await safeUnlink(path.join(uploadsRoot, "avatars", avatarBase));
                        }

                        const bannerBase = fileBasename(u.banner_url);
                        if (bannerBase) {
                            await safeUnlink(path.join(uploadsRoot, "banners", bannerBase));
                        }

                        // DB cleanup:
                        // - videos + subscriptions records (chat/messages history kept; FK set to NULL).
                        await pool.query(`DELETE FROM videos WHERE user_id = $1`, [userId]);
                        await pool.query(
                            `DELETE FROM subscriptions
                             WHERE subscriber_id = $1 OR channel_id = $1`,
                            [userId]
                        );

                        // Ensure messages/chats remain (FKs should be set NULL, but double-safety).
                        await pool.query(`UPDATE messages SET sender_id = NULL WHERE sender_id = $1`, [userId]);
                        await pool.query(`UPDATE chats SET user1_id = NULL WHERE user1_id = $1`, [userId]);
                        await pool.query(`UPDATE chats SET user2_id = NULL WHERE user2_id = $1`, [userId]);

                        // Finally delete user row.
                        await pool.query(`DELETE FROM users WHERE user_id = $1`, [userId]);

                        console.log(`[cron] deleted user ${userId}`);
                    } catch (err) {
                        console.error(`[cron] failed deleting user ${userId}:`, err);
                    }
                }

                console.log("[cron] deleteAccounts job finished");
            });
        })
        .catch((err) => {
            console.warn("[cron] node-cron is not installed, skipping scheduling:", err?.message || err);
        });
}

