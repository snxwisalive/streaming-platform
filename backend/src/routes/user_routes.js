import express from 'express';
import {
    getMe,
    getUser,
    getUsers,
    getRecommendedUsers,
    searchUsersController,
    updateMe,
    uploadMyAvatar,
    uploadMyBanner,
    deactivateMe,
    reactivateMe,
    deleteMe,
    cancelDeletion,
} from '../controllers/UserController.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { uploadAvatar } from '../config/avatarUpload.config.js';
import { uploadBanner } from '../config/bannerUpload.config.js';

const router = express.Router();

router.get('/me', authenticateToken, getMe);
router.get('/recommended', authenticateToken, getRecommendedUsers);
router.get('/search', searchUsersController);
router.get('/', getUsers);
router.post('/me/avatar', authenticateToken, uploadAvatar.single('avatar'), uploadMyAvatar);
router.post('/me/banner', authenticateToken, uploadBanner.single('banner'), uploadMyBanner);
router.get('/:id', getUser);
router.patch('/me', authenticateToken, updateMe);
router.post('/me/deactivate', authenticateToken, deactivateMe);
router.post('/me/reactivate', reactivateMe); // no auth required
router.post('/me/delete', authenticateToken, deleteMe);
router.post('/me/cancel-deletion', cancelDeletion); // no auth required

export default router;