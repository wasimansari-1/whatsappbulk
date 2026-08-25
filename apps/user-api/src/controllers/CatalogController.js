import { catalogService } from '../services/CatalogService.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

export class CatalogController {
  async getProducts(req, res, next) {
    try {
      const products = await catalogService.getProducts(req.organizationId);
      res.status(200).json(apiSuccess(products, 'WhatsApp Catalog products fetched'));
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req, res, next) {
    try {
      const product = await catalogService.createProduct(req.organizationId, req.body);
      res.status(201).json(apiSuccess(product, 'Product created in WhatsApp Catalog'));
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const product = await catalogService.updateProduct(req.organizationId, req.params.id, req.body);
      res.status(200).json(apiSuccess(product, 'Product updated'));
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      await catalogService.deleteProduct(req.organizationId, req.params.id);
      res.status(200).json(apiSuccess(null, 'Product deleted'));
    } catch (error) {
      next(error);
    }
  }

  async syncWithMeta(req, res, next) {
    try {
      const result = await catalogService.syncWithMeta(req.organizationId);
      res.status(200).json(apiSuccess(result, 'WhatsApp Catalog synced with Meta Commerce'));
    } catch (error) {
      next(error);
    }
  }
}

export const catalogController = new CatalogController();
export default catalogController;
