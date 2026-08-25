import { Router } from 'express';
import { adminController } from '../controllers/AdminController.js';

const router = Router();

router.get('/overview', adminController.getDashboardOverview);

// User Management Routes
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/reset-password', adminController.resetUserPassword);
router.delete('/users/:id', adminController.deleteUser);

// Messages & Infrastructure
router.get('/messages', adminController.getMessages);
router.get('/organizations', adminController.getOrganizations);
router.patch('/organizations/:id/status', adminController.updateOrganizationStatus);
router.get('/plans', adminController.getPlans);
router.post('/plans', adminController.createPlan);
router.put('/plans/:id', adminController.updatePlan);
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
