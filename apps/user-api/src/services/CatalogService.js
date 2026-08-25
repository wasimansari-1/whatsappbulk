import { ProductCatalog } from '../models/ProductCatalog.js';
import { metaClient } from './metaClient.js';

export class CatalogService {
  async getProducts(organizationId) {
    let products = await ProductCatalog.find({ organizationId }).sort({ createdAt: -1 }).lean();

    // If no products exist yet for this org, seed 2 realistic WhatsApp Catalog items
    if (!products || products.length === 0) {
      const defaultProducts = [
        {
          organizationId,
          metaCatalogId: 'meta_cat_1049968644261349',
          retailerId: 'SKU-WAPP-SAAS-01',
          name: 'WhatsApp Bulk Messaging SaaS - Enterprise Annual Plan',
          description: 'Includes 100k messages, Meta Cloud API access, 24/7 Chatbot Builder, and CRM integration.',
          price: 24999,
          currency: 'INR',
          availability: 'IN_STOCK',
          category: 'Software & SaaS',
          imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60'
        },
        {
          organizationId,
          metaCatalogId: 'meta_cat_1049968644261349',
          retailerId: 'SKU-WAPP-BOT-02',
          name: 'Custom AI WhatsApp Chatbot & Workflow Automation Pack',
          description: 'Done-for-you conversational flow setup with lead capture and WhatsApp Commerce checkout.',
          price: 9999,
          currency: 'INR',
          availability: 'IN_STOCK',
          category: 'Services',
          imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60'
        }
      ];

      await ProductCatalog.insertMany(defaultProducts);
      products = await ProductCatalog.find({ organizationId }).sort({ createdAt: -1 }).lean();
    }

    return products;
  }

  async createProduct(organizationId, data) {
    const retailerId = data.retailerId || `SKU-${Date.now().toString().slice(-6)}`;
    const product = await ProductCatalog.create({
      ...data,
      organizationId,
      retailerId,
      currency: 'INR'
    });
    return product.toObject();
  }

  async updateProduct(organizationId, id, data) {
    const product = await ProductCatalog.findOneAndUpdate(
      { organizationId, _id: id },
      { $set: data },
      { new: true }
    );
    return product ? product.toObject() : null;
  }

  async deleteProduct(organizationId, id) {
    await ProductCatalog.findOneAndDelete({ organizationId, _id: id });
    return { success: true };
  }

  async syncWithMeta(organizationId) {
    const wabaId = metaClient.getWabaId();
    // Query Meta Graph API for product catalogs
    const res = await metaClient.get(`${wabaId}/product_catalogs`);
    const count = await ProductCatalog.countDocuments({ organizationId });

    return {
      syncedAt: new Date().toISOString(),
      wabaId,
      catalogCount: count,
      metaCatalogs: res.data?.data || []
    };
  }
}

export const catalogService = new CatalogService();
export default catalogService;
