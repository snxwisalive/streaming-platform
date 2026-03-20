import { verifyToken } from '../utils/auth.utils.js';
import { pool } from "../db/db.js";

export const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = verifyToken(token);

        pool.query(
            `SELECT is_active, deleted_at
             FROM users
             WHERE user_id = $1
             LIMIT 1`,
            [decoded.user_id]
        ).then(({ rows }) => {
            if (!rows || rows.length === 0) {
                return res.status(403).json({ error: 'Акаунт видалено' });
            }

            const { is_active: isActive, deleted_at: deletedAt } = rows[0];

            if (deletedAt) {
                return res.status(403).json({ error: 'Акаунт видалено' });
            }

            if (isActive === false) {
                return res.status(403).json({ error: 'Акаунт деактивовано' });
            }

            req.user = decoded;
            next();
        }).catch(() => res.status(500).json({ message: 'Authentication failed' }));
    } catch (error) {
        if (error.message === 'Token expired') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(403).json({ message: 'Invalid token' });
    }
};