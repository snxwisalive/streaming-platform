import { getAllUsers, getRecommendedUsersForSubscriber, getUserById, updateUser, findUserByEmail, findUserByNickname, searchUsersByNickname } from '../db/user.repository.js';
import { getIo } from "../socket.js";
import { pool } from "../db/db.js";
import { comparePassword, generateToken } from "../utils/auth.utils.js";

const BIO_MAX_LENGTH = 500;

export const getMe = async (req, res) => {
    const user = await getUserById(req.user.user_id);
    res.json(user);
};

export const getUser = async (req, res) => {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
};

export const getUsers = async (req, res) => {
    const users = await getAllUsers();
    res.json(users);
};

export const searchUsersController = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q || String(q).trim().length === 0) {
            return res.json([]);
        }
        const users = await searchUsersByNickname(String(q).trim(), limit);
        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Failed to search users', error: error.message });
    }
};

export const getRecommendedUsers = async (req, res) => {
    try {
        const subscriberId = req.user?.user_id;
        const { limit } = req.query;

        const users = await getRecommendedUsersForSubscriber(subscriberId, limit);
        res.json(users);
    } catch (error) {
        console.error('Get recommended users error:', error);
        res.status(500).json({ message: 'Failed to get recommended users', error: error.message });
    }
};

export const updateMe = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const payload = {};
        if (typeof req.body.nickname === 'string') {
            const nickname = req.body.nickname.trim();
            if (!nickname) {
                return res.status(400).json({ message: 'Nickname is required' });
            }
            const existing = await findUserByNickname(nickname);
            if (existing && String(existing.user_id) !== String(userId)) {
                return res.status(400).json({ message: 'Nickname already exists' });
            }
            payload.nickname = nickname;
        }

        if (typeof req.body.bio === 'string') {
            if (req.body.bio.length > BIO_MAX_LENGTH) {
                return res.status(400).json({ message: `Bio must be at most ${BIO_MAX_LENGTH} characters` });
            }
            payload.bio = req.body.bio;
        }

        const updated = await updateUser(userId, payload);
        res.json(updated);
    } catch (error) {
        console.error('Update me error:', error);
        res.status(500).json({ message: 'Failed to update profile', error: error.message });
    }
};

export const uploadMyAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'avatar file is required' });
        }

        // served by express.static('/uploads', path.resolve('uploads'))
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        const updated = await updateUser(req.user.user_id, { avatar_url: avatarUrl });
        // Notify navbar/profile UIs in other tabs instantly.
        getIo()?.emit("user_profile_changed", {
            userId: updated?.user_id,
            avatar_url: updated?.avatar_url,
        });
        res.json(updated);
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ message: 'Failed to upload avatar', error: error.message });
    }
};

export const uploadMyBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'banner file is required' });
        }

        const bannerUrl = `/uploads/banners/${req.file.filename}`;
        const updated = await updateUser(req.user.user_id, { banner_url: bannerUrl });
        getIo()?.emit("user_profile_changed", {
            userId: updated?.user_id,
            banner_url: updated?.banner_url,
        });
        res.json(updated);
    } catch (error) {
        console.error('Upload banner error:', error);
        res.status(500).json({ message: 'Failed to upload banner', error: error.message });
    }
};

export const deactivateMe = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Soft-deactivate: block login + hide profile (is_active=false).
        const updated = await updateUser(userId, { is_active: false });
        if (!updated) return res.status(404).json({ message: 'User not found' });

        // Notify UI so subscriptions lists refresh in real-time.
        getIo()?.emit("subscriptions_changed", { userId });
        getIo()?.emit("account_deactivated", { userId });

        res.json({ message: 'Акаунт деактивовано' });
    } catch (error) {
        console.error('Deactivate me error:', error);
        res.status(500).json({ message: 'Failed to deactivate account', error: error.message });
    }
};

export const reactivateMe = async (req, res) => {
    try {
        // No auth required: body: { email, password }
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: "Invalid login or password" });
        }

        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid login or password" });
        }

        // Reactivation from deactivation only (deleted_at must be NULL).
        if (user.is_active === false && user.deleted_at == null) {
            const updated = await updateUser(user.user_id, {
                is_active: true,
                deleted_at: null,
                deletion_scheduled_at: null,
            });

            const token = generateToken({
                user_id: updated.user_id,
                nickname: updated.nickname,
                email: updated.email,
            });

            getIo()?.emit("subscriptions_changed", { userId: updated.user_id });
            getIo()?.emit("chat_data_changed", { chatId: null });

            return res.json({
                user: {
                    user_id: updated.user_id,
                    nickname: updated.nickname,
                    email: updated.email,
                    birthday: user.birth_date,
                },
                token,
            });
        }

        return res.status(403).json({ message: "Account cannot be reactivated" });
    } catch (error) {
        console.error("Reactivate me error:", error);
        res.status(500).json({ message: "Failed to reactivate account", error: error.message });
    }
};

export const deleteMe = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // POST /users/me/delete: body { password } for confirmation.
        const { password } = req.body || {};
        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        const { rows } = await pool.query(
            `SELECT password_hash
             FROM users
             WHERE user_id = $1`,
            [userId]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await comparePassword(password, rows[0].password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const updated = await updateUser(userId, {
            is_active: false,
            deleted_at: new Date(),
            deletion_scheduled_at: deletionDate,
        });

        getIo()?.emit("subscriptions_changed", { userId });
        getIo()?.emit("chat_data_changed", { chatId: null });

        res.json({
            message: 'Акаунт буде видалено через 30 днів',
            deletion_date: deletionDate.toISOString(),
            user: updated,
        });
    } catch (error) {
        console.error('Delete me error:', error);
        res.status(500).json({ message: 'Failed to delete account', error: error.message });
    }
};

export const cancelDeletion = async (req, res) => {
    try {
        // No auth required: body: { email, password }
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: "Invalid login or password" });
        }

        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid login or password" });
        }

        if (!user.deleted_at) {
            return res.status(403).json({ message: "Account is not scheduled for deletion" });
        }

        const now = new Date();
        const scheduledAt = user.deletion_scheduled_at ? new Date(user.deletion_scheduled_at) : null;
        if (!scheduledAt || scheduledAt.getTime() <= now.getTime()) {
            return res.status(403).json({ message: "Account deletion cannot be cancelled" });
        }

        const updated = await updateUser(user.user_id, {
            is_active: true,
            deleted_at: null,
            deletion_scheduled_at: null,
        });

        const token = generateToken({
            user_id: updated.user_id,
            nickname: updated.nickname,
            email: updated.email,
        });

        getIo()?.emit("subscriptions_changed", { userId: updated.user_id });
        getIo()?.emit("chat_data_changed", { chatId: null });

        res.json({
            message: 'Видалення скасовано, акаунт відновлено',
            user: {
                user_id: updated.user_id,
                nickname: updated.nickname,
                email: updated.email,
                birthday: user.birth_date,
            },
            token,
        });
    } catch (error) {
        console.error("Cancel deletion error:", error);
        res.status(500).json({ message: "Failed to cancel deletion", error: error.message });
    }
};
