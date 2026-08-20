import { Router } from 'express';
import adminRoutes from './admin.routes.js';

const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'HEALTHY', timestamp: new Date(), service: 'admin-api' });
});

apiRouter.use('/v1/admin', adminRoutes);

export default apiRouter;
