import { Router } from 'express';
import { adminController } from '../controllers/AdminController.js';

const router = Router();

router.get('/overview', adminController.getDashboardOverview);
router.get('/organizations', adminController.getOrganizations);
router.patch('/organizations/:id/status', adminController.updateOrganizationStatus);
router.get('/plans', adminController.getPlans);
router.post('/plans', adminController.createPlan);
router.put('/plans/:id', adminController.updatePlan);
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
