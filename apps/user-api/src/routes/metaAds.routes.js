import { Router } from 'express';
import { metaAdsController } from '../controllers/MetaAdsController.js';
import { authGuard } from '../middleware/authGuard.js';
import { metaAdsTenantGuard } from '../middleware/metaAdsGuard.js';

const router = Router();

router.use(authGuard);
router.use(metaAdsTenantGuard);

router.get('/business', metaAdsController.getBusinessOverview);
router.get('/pages', metaAdsController.getPages);
router.get('/forms', metaAdsController.getLeadForms);
router.post('/forms', metaAdsController.createLeadForm);
router.get('/campaigns', metaAdsController.getCampaigns);
router.post('/campaigns', metaAdsController.createCampaign);
router.patch('/campaigns/:id/status', metaAdsController.updateCampaignStatus);
router.post('/sync', metaAdsController.syncAll);
router.post('/sync-historical-leads', metaAdsController.syncHistoricalLeads);
router.get('/insights', metaAdsController.getInsights);
router.get('/activity-logs', metaAdsController.getActivityLogs);
router.get('/oauth/start', metaAdsController.oauthStart);
router.post('/oauth/callback', metaAdsController.oauthCallback);
router.post('/connect-assets', metaAdsController.connectAssets);
router.post('/oauth-exchange', metaAdsController.oauthExchange);
router.get('/user-assets', metaAdsController.getUserAssets);
router.post('/update-token', metaAdsController.updateMetaToken);
router.post('/load-demo', metaAdsController.loadDemo);

export default router;
