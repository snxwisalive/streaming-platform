import { Router } from 'express';
import { getAnalyticsOverview } from '../controllers/AnalyticsController.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/overview', authenticateToken, getAnalyticsOverview);

export default router;