import { Router } from 'express';
import { catalogController } from '../controllers/CatalogController.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.use(authGuard);

router.get('/products', catalogController.getProducts);
router.post('/products', catalogController.createProduct);
router.put('/products/:id', catalogController.updateProduct);
router.delete('/products/:id', catalogController.deleteProduct);
router.post('/sync', catalogController.syncWithMeta);

export default router;
