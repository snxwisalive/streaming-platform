import { Router } from 'express';
import {
    subscribeToUser,
    unsubscribeFromUser,
    getSubscriptionStatus,
    getMySubscriptions,
    getSubscribedFeed
} from '../controllers/SubscriptionController.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/subscribe', authenticateToken, subscribeToUser);
router.post('/unsubscribe', authenticateToken, unsubscribeFromUser);
router.get('/status', authenticateToken, getSubscriptionStatus);
router.get('/me', authenticateToken, getMySubscriptions);
router.get('/feed', authenticateToken, getSubscribedFeed);

export default router;