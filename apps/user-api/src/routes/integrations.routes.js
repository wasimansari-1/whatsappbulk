import { Router } from 'express';
import { integrationsController } from '../controllers/IntegrationsController.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.use(authGuard);

router.get('/', integrationsController.getIntegrations);
router.patch('/:type/toggle', integrationsController.toggleIntegration);
router.get('/api-keys', integrationsController.getApiKeys);
router.post('/api-keys', integrationsController.generateApiKey);

export default router;
