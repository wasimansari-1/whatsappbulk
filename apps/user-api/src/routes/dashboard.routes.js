import { Router } from 'express';
import { dashboardController } from '../controllers/DashboardController.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.use(authGuard);
router.get('/', dashboardController.getDashboardData);

export default router;
