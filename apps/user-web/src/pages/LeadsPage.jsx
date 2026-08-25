import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Target,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Trash2,
  Edit2,
  X,
  Megaphone,
  TrendingUp,
  DollarSign,
  Users,
  MessageSquare,
  Send,
  Zap,
  Clock,
  ThumbsDown,
  Award,
  RefreshCw,
  Eye,
  Sliders,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Facebook,
  Check,
  Smartphone,
  Globe,
  Layers,
  FileText,
  Activity,
  Code,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Lock,
  Key,
  Download
} from 'lucide-react';

import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, activeOrganization } = useAuthStore();

  // Real-time Live Webhook & Socket Dispatcher
  useSocket((event, data) => {
    if (event === 'lead.new' || event === 'lead.created') {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
      toast.success(`New Lead Captured: ${data?.lead?.name || 'Customer'} (${data?.lead?.phone || ''})`, 'Real-time Lead');
    } else if (event === 'lead.updated') {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
    } else if (event === 'campaign.new' || event === 'campaign.updated' || event === 'meta.synced') {
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
    }
  });

  // Navigation Tab: 'OVERVIEW', 'PAGES_FORMS', 'CAMPAIGNS', 'LEADS_CRM', 'SYNC_AUDIT'
  const [activeMainTab, setActiveMainTab] = useState('LEADS_CRM');

  // Leads CRM Stage Sub-tab: 'ALL', 'NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'LOST'
  const [crmStage, setCrmStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState('');
  const [selectedFormFilter, setSelectedFormFilter] = useState('');

  // Date Range & Historical Filters (Lifetime, Month/Year, Custom Dates)
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL', 'TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM_MONTH', 'CUSTOM_RANGE'
  const [selectedMonth, setSelectedMonth] = useState('ALL'); // 'ALL', '1', '2', '3', ..., '12'
  const [selectedYear, setSelectedYear] = useState('2025'); // e.g. 2025, 2026
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals & Drawers State
  const [connectTab, setConnectTab] = useState('META_LOGIN');
  const [isConnectPageModalOpen, setIsConnectPageModalOpen] = useState(false);
  const [isUpdateTokenModalOpen, setIsUpdateTokenModalOpen] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState('');
  const [newAdAccountIdValue, setNewAdAccountIdValue] = useState('');
  const [newPageIdValue, setNewPageIdValue] = useState('');
  const [isCreateCampaignModalOpen, setIsCreateCampaignModalOpen] = useState(false);
  const [isCreateFormModalOpen, setIsCreateFormModalOpen] = useState(false);
  const [selectedLeadDrawer, setSelectedLeadDrawer] = useState(null);
  const [rawMetaModalData, setRawMetaModalData] = useState(null);

  // Facebook Connection State
  const [customPageId, setCustomPageId] = useState('');
  const [customPageName, setCustomPageName] = useState(activeOrganization?.name || user?.name || '');
  const [customAdAccountId, setCustomAdAccountId] = useState('');

  // Bulk Selection & Broadcast State
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [isBulkBroadcastModalOpen, setIsBulkBroadcastModalOpen] = useState(false);
  const [bulkMessageText, setBulkMessageText] = useState('Hello {{name}}, thank you for reaching out to us from our recent offer! We would love to give you a quick walkthrough.');

  // Forms State
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    objective: 'MESSAGES',
    dailyBudget: 500,
    adSetName: 'Target: WhatsApp Audience (India)',
    headline: 'Chat with us directly on WhatsApp',
    primaryText: 'Get instant quotes and 24/7 service support on WhatsApp.',
    ctaType: 'WHATSAPP_MESSAGE'
  });

  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    privacyPolicyUrl: 'https://wappbiz.io/privacy',
    questions: [
      { type: 'FULL_NAME', key: 'full_name', label: 'Full Name' },
      { type: 'PHONE', key: 'phone_number', label: 'Phone Number' },
      { type: 'EMAIL', key: 'email', label: 'Email' }
    ]
  });

  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    stage: 'NEW',
    priority: 'MEDIUM',
    dealValue: 0,
    source: 'Meta Click-to-WhatsApp',
    metaCampaignName: '',
    notes: '',
    followUpDate: ''
  });

  // 1. Fetch Meta Business Overview from Meta Graph API
  const { data: businessOverviewRes, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ['meta-business-overview'],
    queryFn: () => api.get('/meta-ads/business')
  });

  const business = businessOverviewRes?.data || {
    isConnected: false,
    businessName: activeOrganization?.name || user?.name || '',
    wabaId: '',
    accountReviewStatus: 'NOT_CONNECTED',
    displayPhoneNumber: '',
    phoneNumberId: '',
    verifiedName: '',
    adAccountId: '',
    pages: [],
    tokenScopes: [],
    isValidToken: false,
    applicationName: 'Meta Ads Pipeline'
  };

  const isFacebookConnected = Boolean(business.isConnected && business.pages?.length > 0);

  // 2. Fetch Pages & Lead Forms
  const { data: pagesRes } = useQuery({
    queryKey: ['meta-pages'],
    queryFn: () => api.get('/meta-ads/pages'),
    enabled: Boolean(isFacebookConnected)
  });
  const pages = pagesRes?.data || business.pages || [];

  const { data: leadFormsRes } = useQuery({
    queryKey: ['meta-lead-forms'],
    queryFn: () => api.get('/meta-ads/forms'),
    enabled: Boolean(isFacebookConnected)
  });
  const leadForms = leadFormsRes?.data || [];

  // 3. Fetch Campaigns (Auto-syncs live from Meta every 30s)
  const { data: campaignsRes } = useQuery({
    queryKey: ['meta-campaigns'],
    queryFn: () => api.get('/meta-ads/campaigns'),
    enabled: Boolean(isFacebookConnected),
    refetchInterval: 30000
  });
  const campaigns = campaignsRes?.data || [];

  // 4. Fetch CRM Stage Counts (Respecting Time and Campaign Filters)
  const { data: countsRes } = useQuery({
    queryKey: ['lead-counts', datePreset, selectedMonth, selectedYear, customStartDate, customEndDate, selectedCampaignFilter, selectedFormFilter],
    queryFn: () =>
      api.get('/leads/counts', {
        params: {
          preset: datePreset,
          month: datePreset === 'CUSTOM_MONTH' ? selectedMonth : undefined,
          year: datePreset === 'CUSTOM_MONTH' ? selectedYear : undefined,
          startDate: datePreset === 'CUSTOM_RANGE' ? customStartDate : undefined,
          endDate: datePreset === 'CUSTOM_RANGE' ? customEndDate : undefined,
          metaCampaignId: selectedCampaignFilter || undefined,
          metaFormId: selectedFormFilter || undefined
        }
      }),
    enabled: Boolean(isFacebookConnected),
    refetchInterval: 10000
  });
  const counts = countsRes?.data || {
    TOTAL: 0,
    NEW: 0,
    CONTACTED: 0,
    INTERESTED: 0,
    NOT_INTERESTED: 0,
    QUALIFIED: 0,
    FOLLOW_UP: 0,
    CONVERTED: 0,
    LOST: 0,
    TOTAL_VALUE: 0
  };

  // 5. Fetch Leads (Respecting Filters, Live auto-sync every 10s)
  const { data: leadsRes, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['leads', crmStage, searchQuery, datePreset, selectedMonth, selectedYear, customStartDate, customEndDate, selectedCampaignFilter, selectedFormFilter],
    queryFn: () =>
      api.get('/leads', {
        params: {
          stage: crmStage === 'ALL' ? undefined : crmStage,
          search: searchQuery || undefined,
          preset: datePreset,
          month: datePreset === 'CUSTOM_MONTH' ? selectedMonth : undefined,
          year: datePreset === 'CUSTOM_MONTH' ? selectedYear : undefined,
          startDate: datePreset === 'CUSTOM_RANGE' ? customStartDate : undefined,
          endDate: datePreset === 'CUSTOM_RANGE' ? customEndDate : undefined,
          metaCampaignId: selectedCampaignFilter || undefined,
          metaFormId: selectedFormFilter || undefined
        }
      }),
    enabled: Boolean(isFacebookConnected),
    refetchInterval: 10000
  });
  const leads = leadsRes?.data || [];

  // 6. Fetch Activity Audit Logs
  const { data: auditLogsRes } = useQuery({
    queryKey: ['meta-activity-logs'],
    queryFn: () => api.get('/meta-ads/activity-logs'),
    enabled: activeMainTab === 'SYNC_AUDIT'
  });
  const auditLogs = auditLogsRes?.data || [];

  // Mutations
  const syncMetaMutation = useMutation({
    mutationFn: () => {
      const loadId = toast.loading('Syncing real-time campaigns, lead forms & insights from Meta...', 'Syncing Meta');
      return api.post('/meta-ads/sync').then((res) => {
        toast.dismiss(loadId);
        return res;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['meta-lead-forms'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['meta-activity-logs'] });
      toast.success('Meta Cloud API sync completed successfully!', 'Synced');
    }
  });

  const syncHistoricalLeadsMutation = useMutation({
    mutationFn: () => {
      const loadId = toast.loading('Retrieving available leads from Meta Lead Retrieval API...', 'Syncing Historical Leads');
      return api.post('/meta-ads/sync-historical-leads').then((res) => {
        toast.dismiss(loadId);
        return res;
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
      queryClient.invalidateQueries({ queryKey: ['meta-activity-logs'] });
      toast.success(res.data?.message || 'Historical lead sync completed!', 'Historical Leads Synced');
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message, 'Historical Sync Notice')
  });

  const updateMetaTokenMutation = useMutation({
    mutationFn: (data) => {
      const loadId = toast.loading('Authenticating with Meta Marketing API & syncing real campaigns...', 'Meta Authentication');
      return api.post('/meta-ads/update-token', data).then((res) => {
        toast.dismiss(loadId);
        return res;
      });
    },
    onSuccess: (res) => {
      setIsUpdateTokenModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['meta-business-overview'] });
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['meta-lead-forms'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(
        `Meta Connected! Synced ${res.data?.syncedCampaignsCount ?? 0} authentic campaigns and ${res.data?.syncedLeadsCount ?? 0} real leads directly from Meta.`,
        'Meta Authenticated'
      );
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message, 'Token Authentication Error')
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data) => {
      const loadId = toast.loading('Publishing Click-to-WhatsApp Campaign to Meta Marketing API...', 'Publishing Campaign');
      return api.post('/meta-ads/campaigns', data).then((res) => {
        toast.dismiss(loadId);
        return res;
      });
    },
    onSuccess: () => {
      setIsCreateCampaignModalOpen(false);
      setNewCampaign({
        name: '',
        objective: 'MESSAGES',
        dailyBudget: 500,
        adSetName: 'Target: WhatsApp Audience (India)',
        headline: 'Chat with us directly on WhatsApp',
        primaryText: 'Get instant quotes and 24/7 service support on WhatsApp.',
        ctaType: 'WHATSAPP_MESSAGE'
      });
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['meta-activity-logs'] });
      toast.success('Campaign created and active on Meta Marketing API!', 'Campaign Published');
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message, 'Publishing Error')
  });

  const toggleCampaignMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/meta-ads/campaigns/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['meta-activity-logs'] });
      toast.success('Campaign status updated on Meta Graph API.', 'Status Updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message, 'Update Failed')
  });

  const createLeadFormMutation = useMutation({
    mutationFn: (data) => {
      const loadId = toast.loading('Registering Instant Lead Form on Meta Page...', 'Creating Form');
      return api.post('/meta-ads/forms', data).then((res) => {
        toast.dismiss(loadId);
        return res;
      });
    },
    onSuccess: () => {
      setIsCreateFormModalOpen(false);
      setNewLeadForm({
        name: '',
        privacyPolicyUrl: 'https://wappbiz.io/privacy',
        questions: [
          { type: 'FULL_NAME', key: 'full_name', label: 'Full Name' },
          { type: 'PHONE', key: 'phone_number', label: 'Phone Number' },
          { type: 'EMAIL', key: 'email', label: 'Email' }
        ]
      });
      queryClient.invalidateQueries({ queryKey: ['meta-lead-forms'] });
      queryClient.invalidateQueries({ queryKey: ['meta-activity-logs'] });
      toast.success('Lead form published to Facebook Page!', 'Form Created');
    }
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: ({ id, stage }) => api.patch(`/leads/${id}/stage`, { stage }),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
      if (selectedLeadDrawer && selectedLeadDrawer._id === vars.id) {
        setSelectedLeadDrawer({ ...selectedLeadDrawer, stage: vars.stage });
      }
      toast.success(`CRM Stage updated to ${vars.stage.replace('_', ' ')}!`, 'Stage Changed');
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/leads/${id}`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
      if (selectedLeadDrawer) setSelectedLeadDrawer(res.data?.data || selectedLeadDrawer);
      toast.success('Lead updated in CRM.', 'Saved');
    }
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      setSelectedLeadDrawer(null);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
      toast.success('Lead deleted from CRM.', 'Deleted');
    }
  });

  const bulkUpdateStageMutation = useMutation({
    mutationFn: ({ leadIds, stage }) => api.post('/leads/bulk-stage', { leadIds, stage }),
    onSuccess: (res) => {
      setSelectedLeadIds([]);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
      toast.success(res.data?.message || 'Updated leads stage in bulk!', 'Bulk Update');
    }
  });

  const bulkSendBroadcastMutation = useMutation({
    mutationFn: ({ leadIds, messageText }) => api.post('/leads/bulk-broadcast', { leadIds, messageText }),
    onSuccess: (res) => {
      setIsBulkBroadcastModalOpen(false);
      setSelectedLeadIds([]);
      toast.success(res.data?.message || 'Bulk WhatsApp message dispatched!', 'Broadcast Sent');
    }
  });

  const [wizardStep, setWizardStep] = useState(1);
  const [isConnectingFB, setIsConnectingFB] = useState(false);
  const [discoveredPages, setDiscoveredPages] = useState([]);
  const [discoveredAdAccounts, setDiscoveredAdAccounts] = useState([]);
  const [discoveredUser, setDiscoveredUser] = useState(null);
  const [userAccessToken, setUserAccessToken] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedAdAccountId, setSelectedAdAccountId] = useState('');

  const [metaAuthError, setMetaAuthError] = useState(null);

  // 1. OAuth Callback Mutation
  const oauthCallbackMutation = useMutation({
    mutationFn: (data) => {
      const loadId = toast.loading('Exchanging authorization code & discovering Meta assets...', 'Meta Assets Discovery');
      return api.post('/meta-ads/oauth/callback', data).then((res) => {
        toast.dismiss(loadId);
        return res;
      });
    },
    onSuccess: (res) => {
      const { pages = [], adAccounts = [], user = null, userAccessToken: uToken = '' } = res.data || {};
      setDiscoveredPages(pages);
      setDiscoveredAdAccounts(adAccounts);
      setDiscoveredUser(user);
      setUserAccessToken(uToken);
      if (pages.length > 0) setSelectedPageId(pages[0].id);
      if (adAccounts.length > 0) setSelectedAdAccountId(adAccounts[0].id || adAccounts[0].account_id);
      setWizardStep(2);
      setMetaAuthError(null);
      toast.success(`Facebook Connected! Discovered ${pages.length} Pages and ${adAccounts.length} Ad Accounts.`, 'Assets Discovered');
    },
    onError: (err) => {
      setIsConnectingFB(false);
      const errMsg = err.response?.data?.message || err.message || '';
      if (errMsg.toLowerCase().includes('active') || errMsg.toLowerCase().includes('not active')) {
        setMetaAuthError('App not active');
      } else {
        toast.error(errMsg, 'Meta OAuth Error');
      }
    }
  });

  // 2. Connect Selected Assets Mutation
  const connectAssetsMutation = useMutation({
    mutationFn: (data) => {
      const loadId = toast.loading('Connecting selected Page, subscribing webhooks & syncing campaigns...', 'Linking Assets');
      return api.post('/meta-ads/connect-assets', data).then((res) => {
        toast.dismiss(loadId);
        return res;
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['meta-business-overview'] });
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['meta-lead-forms'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(res.data?.message || 'Facebook Page & Ad Account connected successfully!', 'Assets Active');
    },
    onError: (err) => {
      setWizardStep(2);
      toast.error(err.response?.data?.message || err.message, 'Connection Error');
    }
  });

  // Check URL on load for OAuth redirect callback (?code=...&state=... or ?error=...)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const errorParam = params.get('error') || params.get('error_reason') || params.get('error_description');

    if (errorParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setMetaAuthError('App not active');
      return;
    }

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      oauthCallbackMutation.mutate({
        code,
        state,
        redirectUri: window.location.origin + '/leads'
      });
    }
  }, []);

  // 1-Click WhatsApp Live Action
  const handleStartWhatsAppChat = (lead) => {
    toast.success(`Opening live WhatsApp chat with ${lead.name}...`, 'Live Inbox');
    navigate(`/inbox?phone=${lead.phone}`);
  };

  const crmStagesList = [
    { key: 'ALL', label: 'All Leads', count: counts.TOTAL, color: 'text-slate-900 border-slate-900' },
    { key: 'NEW', label: 'New', count: counts.NEW, color: 'text-blue-700 border-blue-600' },
    { key: 'CONTACTED', label: 'Contacted', count: counts.CONTACTED, color: 'text-indigo-700 border-indigo-600' },
    { key: 'INTERESTED', label: '🔥 Interested', count: counts.INTERESTED, color: 'text-rose-700 border-rose-600' },
    { key: 'NOT_INTERESTED', label: '❌ Not Interested', count: counts.NOT_INTERESTED, color: 'text-slate-600 border-slate-500' },
    { key: 'QUALIFIED', label: 'Qualified', count: counts.QUALIFIED, color: 'text-purple-700 border-purple-600' },
    { key: 'FOLLOW_UP', label: '📅 Follow-up', count: counts.FOLLOW_UP, color: 'text-amber-700 border-amber-600' },
    { key: 'CONVERTED', label: '🏆 Converted', count: counts.CONVERTED, color: 'text-emerald-700 border-emerald-600' },
    { key: 'LOST', label: 'Lost', count: counts.LOST, color: 'text-rose-900 border-rose-800' }
  ];

  // Official Facebook Login for Business Starter
  const handleFacebookLoginClick = async () => {
    console.log('[FACEBOOK LOGIN] Initiating Facebook Login with Meta JS SDK...');
    setIsConnectingFB(true);
    setMetaAuthError(null);

    // 1. Ensure FB SDK is ready
    const getFbSdk = async () => {
      if (window.FB) return window.FB;
      return new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (window.FB) {
            clearInterval(interval);
            resolve(window.FB);
          } else if (attempts > 20) {
            clearInterval(interval);
            resolve(null);
          }
        }, 100);
      });
    };

    const FB = await getFbSdk();

    if (FB) {
      try {
        FB.init({
          appId: '1762437721674469',
          cookie: true,
          xfbml: true,
          version: 'v21.0'
        });
      } catch (e) {
        console.warn('[Facebook Login] FB.init notice:', e.message);
      }

      // 2. Launch official FB.login dialog modal with Facebook Login for Business
      FB.login(
        (response) => {
          if (response.authResponse && (response.authResponse.accessToken || response.authResponse.code)) {
            console.log('[Facebook Login] Authorization granted! Exchanging token with backend...');
            oauthCallbackMutation.mutate({
              accessToken: response.authResponse.accessToken,
              code: response.authResponse.code,
              redirectUri: window.location.origin + '/leads'
            });
          } else {
            setIsConnectingFB(false);
            const errorMsg =
              response.status === 'not_authorized'
                ? 'Not authorized. Please grant Facebook Page & Lead permissions.'
                : 'Facebook Login window was closed or cancelled.';
            toast.error(errorMsg, 'Login Cancelled');
          }
        },
        {
          config_id: '4657617971149787',
          response_type: 'code,token',
          override_default_response_type: true
        }
      );
      return;
    }

    // 3. Fallback to Popup URL if FB SDK is blocked by browser extensions
    try {
      const redirectUri = window.location.origin + '/leads';
      const startRes = await api.get(`/meta-ads/oauth/start?redirectUri=${encodeURIComponent(redirectUri)}`);
      const authUrl = startRes.data?.authUrl;

      if (!authUrl) {
        throw new Error('Could not generate Meta OAuth authorization URL.');
      }

      const popupWidth = 650;
      const popupHeight = 750;
      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
      const top = window.screenY + (window.outerHeight - popupHeight) / 2;

      const popup = window.open(
        authUrl,
        'MetaOAuthPopup',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = authUrl;
        return;
      }

      const pollTimer = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(pollTimer);
            setIsConnectingFB(false);
            return;
          }
          const currentUrl = popup.location?.href;
          if (currentUrl) {
            if (currentUrl.includes('code=')) {
              const urlObj = new URL(currentUrl);
              const code = urlObj.searchParams.get('code');
              const state = urlObj.searchParams.get('state');
              popup.close();
              clearInterval(pollTimer);
              setIsConnectingFB(false);
              if (code) {
                oauthCallbackMutation.mutate({
                  code,
                  state,
                  redirectUri
                });
              }
            } else if (currentUrl.includes('error=')) {
              popup.close();
              clearInterval(pollTimer);
              setIsConnectingFB(false);
              setMetaAuthError('App not active');
            }
          }
        } catch (e) {
          // Cross-origin
        }
      }, 600);
    } catch (err) {
      setIsConnectingFB(false);
      toast.error(err.response?.data?.message || err.message, 'OAuth Init Failed');
    }
  };

  // PRE-FLIGHT GATEWAY: 3-STEP WHITE-LABELED MULTI-TENANT META ONBOARDING WIZARD
  if (!isLoadingBusiness && !isFacebookConnected) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50/80 p-4 md:p-8">
        <div className="max-w-2xl w-full bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
              <Facebook className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Official Meta Marketing & Graph API Connection</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Connect Your Facebook Page & Meta Ads</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Link your business Facebook Page to automatically capture incoming lead ads, track campaigns, and trigger instant WhatsApp automations.
            </p>
          </div>

          {/* Step Indicator */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-3 rounded-2xl border text-center transition ${wizardStep === 1 ? 'bg-blue-50 border-blue-300 text-blue-900 font-black' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <span className="text-[10px] uppercase tracking-wider block font-bold">Step 1</span>
              <span className="text-xs">Facebook Access</span>
            </div>
            <div className={`p-3 rounded-2xl border text-center transition ${wizardStep === 2 ? 'bg-blue-50 border-blue-300 text-blue-900 font-black' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <span className="text-[10px] uppercase tracking-wider block font-bold">Step 2</span>
              <span className="text-xs">Select Page & Ads</span>
            </div>
            <div className={`p-3 rounded-2xl border text-center transition ${wizardStep === 3 ? 'bg-blue-50 border-blue-300 text-blue-900 font-black' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <span className="text-[10px] uppercase tracking-wider block font-bold">Step 3</span>
              <span className="text-xs">Meta Verification</span>
            </div>
          </div>

          {/* STEP 1: LOGIN & PERMISSIONS */}
          {wizardStep === 1 && (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Secure Meta Business Verification</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Connect your Facebook account to grant permission for reading instant lead forms and marketing campaigns.
                </p>
              </div>

              {/* Meta "App not active" Diagnostic Warning Card (Section 18) */}
              {metaAuthError && (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-left space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-black text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Facebook connection couldn't be started.</span>
                  </div>
                  <div className="text-xs text-rose-900 space-y-1.5 font-medium leading-relaxed">
                    <p className="font-bold text-rose-950">Meta reports: "{metaAuthError}"</p>
                    <p className="text-[11px] text-rose-800">
                      Please make sure the central Meta Developer App (<strong>App ID: 1762437721674469</strong>) is active in Meta Developer Dashboard (switched from <em>"In Development"</em> to <em>"Live"</em> mode, or add your personal Facebook account to <strong>App Roles &gt; Roles</strong>).
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMetaAuthError(null);
                      handleFacebookLoginClick();
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>
              )}

              {/* Prominent Direct Connection Card */}
              <div className="p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200 rounded-3xl space-y-4 text-left shadow-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Facebook Page & Meta Ads Setup</h3>
                    <p className="text-[11px] text-slate-500">Connect your Facebook Page to capture Instant Lead Ads into CRM</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Facebook Page ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. 1049968644261349"
                      value={selectedPageId}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Meta Ad Account ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. act_1234567890"
                      value={selectedAdAccountId}
                      onChange={(e) => setSelectedAdAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!selectedPageId.trim()) {
                      return toast.error('Please enter a Facebook Page ID to link.', 'Page ID Required');
                    }
                    connectAssetsMutation.mutate({
                      pageId: selectedPageId.trim(),
                      pageName: customPageName || 'Facebook Business Page',
                      adAccountId: selectedAdAccountId.trim(),
                      userAccessToken: userAccessToken.trim() || undefined
                    });
                  }}
                  disabled={connectAssetsMutation.isPending}
                  className="w-full py-4 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-500/25 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  <span>{connectAssetsMutation.isPending ? 'Linking Facebook Page...' : 'Connect Facebook Page & Sync Leads'}</span>
                </button>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-2.5 text-left">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Subscribes your Facebook Page to live <strong>Instant Lead Ads Webhooks</strong> so all incoming Meta leads instantly sync to your CRM and trigger WhatsApp messages.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT ASSETS & AD ACCOUNT */}
          {wizardStep === 2 && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Logged in as {discoveredUser?.name || 'Authorized Facebook User'}</span>
                </div>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-extrabold">VERIFIED</span>
              </div>

              {/* 1. SELECT FACEBOOK PAGE */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Select Facebook Page ({discoveredPages.length} available)</span>
                  <span className="text-[10px] text-slate-400">Required for Lead Ads & CRM</span>
                </label>

                {discoveredPages.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {discoveredPages.map((p) => {
                      const isSelected = selectedPageId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPageId(p.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                            isSelected ? 'bg-blue-50/80 border-blue-500 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                              <Facebook className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black text-slate-900">{p.name}</p>
                              <p className="text-[10px] text-slate-500">ID: {p.id} • {p.category || 'Business Page'}</p>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={selectedPageId}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      placeholder="Enter Facebook Page ID (e.g. 1049968644261349)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* 2. SELECT META AD ACCOUNT */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Select Meta Marketing Ad Account</span>
                  <span className="text-[10px] text-slate-400">For Campaigns & Spend Analytics</span>
                </label>

                {discoveredAdAccounts.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {discoveredAdAccounts.map((acc) => {
                      const accId = acc.id || acc.account_id;
                      const isSelected = selectedAdAccountId === accId;
                      return (
                        <div
                          key={accId}
                          onClick={() => setSelectedAdAccountId(accId)}
                          className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                            isSelected ? 'bg-amber-50/80 border-amber-500 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                              <Target className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black text-slate-900">{acc.name || 'Ad Account'}</p>
                              <p className="text-[10px] text-slate-500">ID: {accId} • Currency: {acc.currency || 'INR'}</p>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={selectedAdAccountId}
                    onChange={(e) => setSelectedAdAccountId(e.target.value)}
                    placeholder="Enter Ad Account ID (e.g. act_681426903930095)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedPageId) {
                      toast.error('Please select or specify a Facebook Page to connect.', 'Page Required');
                      return;
                    }
                    const targetPage = discoveredPages.find((p) => p.id === selectedPageId);
                    setWizardStep(3);
                    connectAssetsMutation.mutate({
                      pageId: selectedPageId,
                      pageName: targetPage?.name || 'Facebook Page',
                      pageCategory: targetPage?.category || 'Business & Brand',
                      adAccountId: selectedAdAccountId,
                      pageAccessToken: targetPage?.access_token || userAccessToken,
                      userAccessToken
                    });
                  }}
                  disabled={connectAssetsMutation.isPending}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${connectAssetsMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>{connectAssetsMutation.isPending ? 'Connecting & Ingesting...' : 'Connect Selected Assets & Activate CRM'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DEEP SYNC PROGRESS */}
          {wizardStep === 3 && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Verifying Assets with Meta API</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Validating Page credentials, subscribing real-time lead webhooks, and synchronizing your campaigns...
                </p>
              </div>

              <div className="space-y-2 max-w-sm mx-auto text-left text-xs font-bold bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Facebook Permissions Validated</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Facebook Page & Lead Webhooks Connected</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Marketing Campaigns & Ad Sets Ingested</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>CRM Leads Pipeline Activated</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6 pb-24">
      {/* 1. TOP HEADER & META AUTHORIZED BUSINESS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Target className="w-6 h-6 text-emerald-600" />
            <span>Meta Business + Ads + Leads CRM Suite</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real Meta Marketing API & Graph API integration. Meta is the source of truth for assets, campaigns, and lead forms.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {/* Live Meta Verified Business Account Pill */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-blue-50 border border-blue-300 rounded-xl text-xs font-bold text-blue-900 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <Facebook className="w-4 h-4 text-blue-700" />
            <span>
              Page: <span className="font-extrabold">{pages[0]?.name || business.businessName}</span> (LIVE)
            </span>
          </div>

          <button
            onClick={() => {
              if (confirm('Do you want to switch or disconnect this Facebook Page?')) {
                disconnectPageMutation.mutate(pages[0]?.id);
              }
            }}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold shadow-xs transition"
          >
            <span>Switch Page</span>
          </button>

          <button
            onClick={() => syncMetaMutation.mutate()}
            disabled={syncMetaMutation.isPending}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            title="Sync with Meta Graph & Marketing API"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${syncMetaMutation.isPending ? 'animate-spin' : ''}`} />
            <span>Sync Meta</span>
          </button>

          <button
            onClick={() => syncHistoricalLeadsMutation.mutate()}
            disabled={syncHistoricalLeadsMutation.isPending}
            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            title="Sync available leads from Meta Lead Retrieval API"
          >
            <Download className={`w-3.5 h-3.5 text-emerald-600 ${syncHistoricalLeadsMutation.isPending ? 'animate-bounce' : ''}`} />
            <span>{syncHistoricalLeadsMutation.isPending ? 'Syncing Leads...' : 'Sync Historical Leads'}</span>
          </button>

          <button
            onClick={() => setIsCreateCampaignModalOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>+ Create Campaign</span>
          </button>

          <button
            onClick={() => setIsCreateFormModalOpen(true)}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition flex items-center space-x-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Create Lead Form</span>
          </button>
        </div>
      </div>

      {/* 1.5 META TOKEN REFRESH BANNER IF TOKEN IS EXPIRED */}
      {!business.isValidToken && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-300 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              ⚠️
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">Meta Access Token Expired / Needs Refresh</p>
              <p className="text-[11px] text-slate-600 font-medium">Your Meta Graph API token needs to be refreshed so all real campaigns and instant leads from your Facebook Ad Account can live sync.</p>
            </div>
          </div>
          <button
            onClick={() => setIsUpdateTokenModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-blue-500/20 transition shrink-0 flex items-center space-x-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Update Meta Token & Sync</span>
          </button>
        </div>
      )}

      {/* 2. MAIN SECTION NAVIGATION TABS (Overview, Pages & Forms, Campaigns, Leads CRM, Sync & Audit) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-extrabold overflow-x-auto">
        <button
          onClick={() => setActiveMainTab('LEADS_CRM')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeMainTab === 'LEADS_CRM'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Leads CRM Pipeline</span>
          <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded-full text-[10px]">
            {counts.TOTAL}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('CAMPAIGNS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeMainTab === 'CAMPAIGNS'
              ? 'bg-blue-50 text-blue-800 border border-blue-300 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Megaphone className="w-4 h-4 text-blue-600" />
          <span>Meta Campaigns & Ads</span>
          <span className="px-1.5 py-0.5 bg-blue-200 text-blue-900 rounded-full text-[10px]">
            {campaigns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('PAGES_FORMS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeMainTab === 'PAGES_FORMS'
              ? 'bg-purple-50 text-purple-800 border border-purple-300 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Facebook className="w-4 h-4 text-purple-600" />
          <span>Pages & Lead Forms</span>
          <span className="px-1.5 py-0.5 bg-purple-200 text-purple-900 rounded-full text-[10px]">
            {leadForms.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('OVERVIEW')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeMainTab === 'OVERVIEW'
              ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-4 h-4 text-slate-600" />
          <span>Business Workspace</span>
        </button>

        <button
          onClick={() => setActiveMainTab('SYNC_AUDIT')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeMainTab === 'SYNC_AUDIT'
              ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-600" />
          <span>Sync & Audit Logs</span>
        </button>
      </div>

      {/* 3. VIEW A: LEADS CRM PIPELINE (Matching Section 5, 6, 7, 18) */}
      {activeMainTab === 'LEADS_CRM' && (
        <div className="space-y-4">
          {/* ADVANCED DATE, MONTH/YEAR & META CAMPAIGN FILTER BAR */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Date Presets */}
              <div className="flex items-center space-x-1 flex-wrap gap-y-1.5 text-xs font-bold">
                <span className="text-[11px] font-black text-slate-400 uppercase mr-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Timeline:</span>
                </span>

                {[
                  { key: 'ALL', label: 'All Lifetime' },
                  { key: 'TODAY', label: 'Today' },
                  { key: 'YESTERDAY', label: 'Yesterday' },
                  { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
                  { key: 'THIS_MONTH', label: 'This Month' },
                  { key: 'LAST_MONTH', label: 'Last Month' },
                  { key: 'CUSTOM_MONTH', label: 'Month & Year 📅' },
                  { key: 'CUSTOM_RANGE', label: 'Custom Range ⏱️' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setDatePreset(item.key)}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      datePreset === item.key
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Total Filtered Leads Badge & Meta Live Status */}
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-extrabold flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{counts.TOTAL} Leads</span>
                </span>

                {counts.TOTAL_VALUE > 0 && (
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-xs font-extrabold flex items-center space-x-1">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    <span>₹{counts.TOTAL_VALUE.toLocaleString()} Pipeline</span>
                  </span>
                )}
              </div>
            </div>

            {/* CONDITIONAL SUB-CONTROLS FOR MONTH/YEAR, CUSTOM DATES, AND CAMPAIGNS */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
              {/* Specific Month & Year Selectors (User specifically requested e.g. January 2025) */}
              {datePreset === 'CUSTOM_MONTH' && (
                <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL">All Months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>

                  <span className="text-xs font-bold text-slate-700">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>
              )}

              {/* Custom Date Pickers */}
              {datePreset === 'CUSTOM_RANGE' && (
                <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                  <span className="text-xs font-bold text-slate-700">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              )}

              {/* Meta Campaign Filter */}
              <div className="flex items-center space-x-2">
                <Megaphone className="w-3.5 h-3.5 text-blue-600" />
                <select
                  value={selectedCampaignFilter}
                  onChange={(e) => setSelectedCampaignFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Meta Campaigns ({campaigns.length})</option>
                  {campaigns.map((c) => (
                    <option key={c.metaCampaignId} value={c.metaCampaignId}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lead Form Filter */}
              {leadForms.length > 0 && (
                <div className="flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <select
                    value={selectedFormFilter}
                    onChange={(e) => setSelectedFormFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Lead Forms ({leadForms.length})</option>
                    {leadForms.map((f) => (
                      <option key={f.metaFormId} value={f.metaFormId}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Reset Button if any filter is active */}
              {(datePreset !== 'ALL' || selectedCampaignFilter || selectedFormFilter || searchQuery) && (
                <button
                  onClick={() => {
                    setDatePreset('ALL');
                    setSelectedCampaignFilter('');
                    setSelectedFormFilter('');
                    setSearchQuery('');
                    setSelectedMonth('ALL');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                >
                  ✕ Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* CRM Stage Navigation Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
            {crmStagesList.map((st) => (
              <button
                key={st.key}
                onClick={() => setCrmStage(st.key)}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  crmStage === st.key
                    ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                }`}
              >
                <p className="text-base font-black text-slate-900 leading-none">{st.count}</p>
                <p className={`text-[11px] font-extrabold mt-1 truncate ${st.color}`}>{st.label}</p>
              </button>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Lead Name, Phone, Email, Meta Lead ID..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {selectedCampaignFilter && (
                <div className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold">
                  <span>Ad Filter Active</span>
                  <button onClick={() => setSelectedCampaignFilter('')} className="text-blue-500 hover:text-blue-800">
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs font-bold text-slate-500">
              <span>Pipeline Value: <span className="text-emerald-700 font-extrabold font-mono">₹{counts.TOTAL_VALUE.toLocaleString('en-IN')}</span></span>
              <span>•</span>
              <span>Showing <span className="text-slate-900 font-extrabold">{leads.length}</span> leads</span>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds(leads.map((l) => l._id));
                          } else {
                            setSelectedLeadIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Lead Name & Phone</th>
                    <th className="p-4">Meta Attribution</th>
                    <th className="p-4">CRM Stage</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Deal Value</th>
                    <th className="p-4">City / Location</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-2">
                          <Users className="w-7 h-7 text-slate-300 mx-auto" />
                          <p className="font-extrabold text-slate-700 text-sm">No Leads in {crmStage.replace('_', ' ')} Stage</p>
                          <p className="text-xs text-slate-500">
                            Incoming Click-to-WhatsApp and Lead Ads from Meta will automatically populate here via webhook.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const isSelected = selectedLeadIds.includes(lead._id);
                      return (
                        <tr
                          key={lead._id}
                          onClick={() => setSelectedLeadDrawer(lead)}
                          className={`transition cursor-pointer group ${
                            isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeadIds((prev) => [...prev, lead._id]);
                                } else {
                                  setSelectedLeadIds((prev) => prev.filter((id) => id !== lead._id));
                                }
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          <td className="p-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                                {lead.name?.charAt(0) || 'L'}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition">{lead.name}</p>
                                <p className="text-[11px] text-slate-500 font-mono">+{lead.phone}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="space-y-0.5 max-w-[220px]">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold block truncate">
                                {lead.metaCampaignName || 'May 25 26'}
                              </span>
                              {lead.metaLeadId && (
                                <p className="text-[10px] text-slate-400 font-mono truncate">ID: {lead.metaLeadId}</p>
                              )}
                            </div>
                          </td>

                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={lead.stage}
                              onChange={(e) => updateLeadStageMutation.mutate({ id: lead._id, stage: e.target.value })}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border cursor-pointer ${
                                lead.stage === 'INTERESTED'
                                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                                  : lead.stage === 'FOLLOW_UP'
                                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                                  : lead.stage === 'CONVERTED'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                  : lead.stage === 'NOT_INTERESTED' || lead.stage === 'LOST'
                                  ? 'bg-slate-100 border-slate-300 text-slate-700'
                                  : 'bg-blue-50 border-blue-300 text-blue-700'
                              }`}
                            >
                              <option value="NEW">New</option>
                              <option value="CONTACTED">Contacted</option>
                              <option value="INTERESTED">🔥 Interested</option>
                              <option value="NOT_INTERESTED">❌ Not Interested</option>
                              <option value="QUALIFIED">Qualified</option>
                              <option value="FOLLOW_UP">📅 Follow-up</option>
                              <option value="CONVERTED">🏆 Converted</option>
                              <option value="LOST">Lost</option>
                            </select>
                          </td>

                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              lead.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' : lead.priority === 'LOW' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {lead.priority || 'MEDIUM'}
                            </span>
                          </td>

                          <td className="p-4 font-mono font-extrabold text-slate-900">
                            ₹{(lead.dealValue || 0).toLocaleString('en-IN')}
                          </td>

                          <td className="p-4">
                            <span className="text-[11px] text-slate-700 font-semibold">{lead.city || 'India'}</span>
                          </td>

                          <td className="p-4 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleStartWhatsAppChat(lead)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition inline-flex items-center shadow-xs"
                              title="1-Click WhatsApp Chat in Inbox"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setSelectedLeadDrawer(lead)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-600 rounded-lg transition"
                              title="Open Lead Details Drawer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Floating Bulk Action Bar */}
          {selectedLeadIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center space-x-4 animate-in slide-in-from-bottom-5 duration-200">
              <span className="text-xs font-black text-emerald-400">
                ✓ {selectedLeadIds.length} Leads Selected
              </span>

              <div className="h-4 w-px bg-slate-700" />

              {/* Bulk WhatsApp Message Button */}
              <button
                onClick={() => setIsBulkBroadcastModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>💬 Send Bulk WhatsApp Message</span>
              </button>

              {/* Bulk Stage Change Dropdown */}
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    bulkUpdateStageMutation.mutate({ leadIds: selectedLeadIds, stage: e.target.value });
                    e.target.value = '';
                  }
                }}
                className="px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="" disabled>🏷️ Move Stage In Bulk...</option>
                <option value="INTERESTED">Move to 🔥 Interested</option>
                <option value="FOLLOW_UP">Move to 📅 Follow-up</option>
                <option value="CONTACTED">Move to 📞 Contacted</option>
                <option value="NOT_INTERESTED">Move to ❌ Not Interested</option>
                <option value="QUALIFIED">Move to Qualified</option>
                <option value="CONVERTED">Move to 🏆 Converted</option>
                <option value="LOST">Move to Lost</option>
              </select>

              <button
                onClick={() => setSelectedLeadIds([])}
                className="text-xs text-slate-400 hover:text-white transition px-2 py-1"
              >
                Deselect All
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. VIEW B: CAMPAIGNS & MARKETING HIERARCHY (Section 8, 9, 10, 11, 12) */}
      {activeMainTab === 'CAMPAIGNS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Meta Marketing API Campaigns</h3>
                <p className="text-xs text-slate-500">Ad Account: <span className="font-bold text-slate-800">{business.adAccountId}</span></p>
              </div>

              <button
                onClick={() => setIsCreateCampaignModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Campaign</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Status on Meta</th>
                    <th className="p-4">Campaign Name & ID</th>
                    <th className="p-4">Objective</th>
                    <th className="p-4">Daily Budget</th>
                    <th className="p-4">Spend (Meta API)</th>
                    <th className="p-4">Impressions</th>
                    <th className="p-4">Clicks</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-3">
                          <Megaphone className="w-8 h-8 text-blue-500 mx-auto opacity-70" />
                          <p className="font-extrabold text-slate-800 text-sm">No Active Campaigns on Meta Ad Account</p>
                          <p className="text-xs text-slate-500">
                            Click "+ Create Campaign" to launch a real Click-to-WhatsApp campaign directly on Meta.
                          </p>
                          <button
                            onClick={() => setIsCreateCampaignModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition inline-flex items-center space-x-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Campaign</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((camp) => (
                      <tr key={camp._id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                toggleCampaignMutation.mutate({
                                  id: camp._id,
                                  status: camp.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                                })
                              }
                              className="focus:outline-hidden"
                              title="Toggle Pause / Resume on Meta"
                            >
                              {camp.status === 'ACTIVE' ? (
                                <span className="w-9 h-5 bg-emerald-500 rounded-full flex items-center p-0.5 transition justify-end shadow-xs">
                                  <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                                </span>
                              ) : (
                                <span className="w-9 h-5 bg-slate-300 rounded-full flex items-center p-0.5 transition justify-start shadow-xs">
                                  <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                                </span>
                              )}
                            </button>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              camp.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : camp.status.includes('DRAFT') || camp.status.includes('PROCESS')
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : camp.status.includes('ERROR') || camp.status.includes('ISSUES') || camp.status.includes('DISAPPROVED')
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {camp.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{camp.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Meta ID: {camp.metaCampaignId}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-black uppercase">
                            {camp.objective}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-800">
                          ₹{camp.dailyBudget.toLocaleString('en-IN')}/day
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900">
                          ₹{(camp.spend || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 font-mono text-slate-700">{camp.impressions || 0}</td>
                        <td className="p-4 font-mono text-slate-700">{camp.clicks || 0}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCampaignFilter(camp.metaCampaignId);
                              setActiveMainTab('LEADS_CRM');
                              toast.info(`Filtering leads for campaign "${camp.name}"`, 'Campaign Leads');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                          >
                            <Users className="w-3 h-3" />
                            <span>View Leads</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. VIEW C: PAGES & LEAD FORMS (Section 3, 13, 14) */}
      {activeMainTab === 'PAGES_FORMS' && (
        <div className="space-y-6">
          {/* Connected Facebook Pages */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Connected Facebook Pages ({pages.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pages.map((p) => (
                <div key={p.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">Page ID: {p.id}</p>
                      <p className="text-[10px] text-emerald-700 font-bold">Category: {p.category || 'Business'}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Real Instant Lead Forms */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Meta Instant Lead Forms ({leadForms.length})</h3>
                <p className="text-xs text-slate-500">Live lead capture forms registered on Meta Graph API.</p>
              </div>

              <button
                onClick={() => setIsCreateFormModalOpen(true)}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Lead Form</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Form Name & Meta ID</th>
                    <th className="p-4">Page</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Questions</th>
                    <th className="p-4">Leads Captured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {leadForms.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-slate-400">
                        No Instant Lead Forms created yet. Click "+ Create Lead Form" to register one on Meta.
                      </td>
                    </tr>
                  ) : (
                    leadForms.map((f) => (
                      <tr key={f._id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{f.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {f.metaFormId}</p>
                        </td>
                        <td className="p-4">{f.pageName || business.businessName}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-black uppercase">
                            {f.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                            {(f.questions || []).map((q, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                                {q.label || q.key}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-600">{f.leadsCount || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. VIEW D: BUSINESS WORKSPACE & PERMISSIONS (Section 1, 2) */}
      {activeMainTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <p className="text-xs font-bold text-slate-500">Meta Business Portfolio</p>
              <h3 className="text-lg font-black text-slate-900">{business.businessName}</h3>
              <p className="text-[11px] text-slate-500 font-mono">WABA ID: {business.wabaId}</p>
              <div className="pt-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black uppercase">
                  Status: {business.accountReviewStatus}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <p className="text-xs font-bold text-slate-500">Verified WhatsApp Phone</p>
              <h3 className="text-lg font-black text-slate-900">{business.displayPhoneNumber}</h3>
              <p className="text-[11px] text-slate-500 font-mono">Phone ID: {business.phoneNumberId}</p>
              <div className="pt-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-black uppercase">
                  Connected & Active
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <p className="text-xs font-bold text-slate-500">Meta Token Status</p>
              <h3 className="text-lg font-black text-emerald-700 flex items-center space-x-1.5">
                <ShieldCheck className="w-5 h-5" />
                <span>Authorized</span>
              </h3>
              <p className="text-[11px] text-slate-500">App: {business.applicationName}</p>
              <div className="pt-2">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[10px] font-black uppercase">
                  Graph API {business.apiVersion || 'v20.0'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Authorized Meta Token Scopes</h4>
            <div className="flex flex-wrap gap-2">
              {business.tokenScopes.map((scope, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800">
                  ✓ {scope}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. VIEW E: SYNC CENTER & ACTIVITY AUDIT LOGS (Section 27, 28) */}
      {activeMainTab === 'SYNC_AUDIT' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Meta Sync Engine</h3>
              <p className="text-xs text-slate-500">Synchronizes campaigns, leads, forms, and message templates directly with Meta Cloud.</p>
            </div>
            <button
              onClick={() => syncMetaMutation.mutate()}
              disabled={syncMetaMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncMetaMutation.isPending ? 'animate-spin' : ''}`} />
              <span>Trigger Full Sync Now</span>
            </button>
          </div>

          {/* Activity Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Meta Activity Audit Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Action</th>
                    <th className="p-4">Meta Object</th>
                    <th className="p-4">Object ID</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400">
                        No recent activity logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 font-bold text-slate-900">{log.action}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                            {log.metaObject}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{log.metaObjectId || 'N/A'}</td>
                        <td className="p-4 text-slate-700 max-w-xs truncate">{log.details}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. LEAD DETAILS DRAWER (Section 6, 7, 18, 21) */}
      {selectedLeadDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                    {selectedLeadDrawer.name?.charAt(0) || 'L'}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{selectedLeadDrawer.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{selectedLeadDrawer.phone}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStartWhatsAppChat(selectedLeadDrawer)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button onClick={() => setSelectedLeadDrawer(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lead Information Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <h4 className="font-extrabold text-slate-900">Lead Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">Email</span>
                    <span className="font-semibold text-slate-800">{selectedLeadDrawer.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">Location</span>
                    <span className="font-semibold text-slate-800">{selectedLeadDrawer.city || selectedLeadDrawer.country || 'India'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">Deal Value (₹)</span>
                    <span className="font-extrabold font-mono text-emerald-700">₹{(selectedLeadDrawer.dealValue || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px]">Assigned Agent</span>
                    <span className="font-semibold text-slate-800">{selectedLeadDrawer.assignedName || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* Meta Attribution Source Information (Preserves Meta Truth) */}
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-blue-900 flex items-center space-x-1.5">
                    <Facebook className="w-3.5 h-3.5 text-blue-600" />
                    <span>Meta Source Attribution</span>
                  </h4>
                  {selectedLeadDrawer.rawMetaFields && (
                    <button
                      onClick={() => setRawMetaModalData(selectedLeadDrawer.rawMetaFields)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      View Raw Meta JSON
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <p><span className="text-blue-700 font-bold">Campaign:</span> {selectedLeadDrawer.metaCampaignName || 'Click-to-WhatsApp Inbound'}</p>
                  {selectedLeadDrawer.metaLeadId && (
                    <p className="font-mono text-slate-500"><span className="text-blue-700 font-bold">Meta Lead ID:</span> {selectedLeadDrawer.metaLeadId}</p>
                  )}
                  {selectedLeadDrawer.metaFormId && (
                    <p className="font-mono text-slate-500"><span className="text-blue-700 font-bold">Form ID:</span> {selectedLeadDrawer.metaFormId}</p>
                  )}
                </div>
              </div>

              {/* Stage Progression & Notes */}
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Change CRM Stage</label>
                  <select
                    value={selectedLeadDrawer.stage}
                    onChange={(e) => updateLeadStageMutation.mutate({ id: selectedLeadDrawer._id, stage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:outline-hidden"
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="INTERESTED">🔥 Interested</option>
                    <option value="NOT_INTERESTED">❌ Not Interested</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="FOLLOW_UP">📅 Follow-up</option>
                    <option value="CONVERTED">🏆 Converted</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Internal Notes & Follow-up Log</label>
                  <textarea
                    rows={3}
                    value={selectedLeadDrawer.notes || ''}
                    onChange={(e) => setSelectedLeadDrawer({ ...selectedLeadDrawer, notes: e.target.value })}
                    placeholder="Add customer requirements, deal notes..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden text-xs"
                  />
                  <button
                    onClick={() => updateLeadMutation.mutate({ id: selectedLeadDrawer._id, data: { notes: selectedLeadDrawer.notes } })}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[11px] transition"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  if (confirm(`Delete lead record for "${selectedLeadDrawer.name}"?`)) {
                    deleteLeadMutation.mutate(selectedLeadDrawer._id);
                  }
                }}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs transition flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lead</span>
              </button>

              <button
                onClick={() => setSelectedLeadDrawer(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. RAW META JSON INSPECTOR MODAL */}
      {rawMetaModalData && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 text-white rounded-3xl shadow-2xl p-6 space-y-4 font-mono text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Code className="w-4 h-4" />
                <span className="font-bold">Raw Meta Graph API JSON Payload</span>
              </div>
              <button onClick={() => setRawMetaModalData(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-2xl overflow-x-auto text-[11px] text-emerald-300 leading-relaxed max-h-96">
              {JSON.stringify(rawMetaModalData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 10. CREATE REAL META CAMPAIGN MODAL (Section 10) */}
      {isCreateCampaignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Create Click-to-WhatsApp Campaign on Meta</h3>
              </div>
              <button onClick={() => setIsCreateCampaignModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g. WhatsApp Direct Leads - Spring 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Daily Budget (₹)</label>
                  <input
                    type="number"
                    value={newCampaign.dailyBudget}
                    onChange={(e) => setNewCampaign({ ...newCampaign, dailyBudget: +e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Objective</label>
                  <select
                    value={newCampaign.objective}
                    onChange={(e) => setNewCampaign({ ...newCampaign, objective: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                  >
                    <option value="MESSAGES">Click to WhatsApp (Messages)</option>
                    <option value="OUTCOME_LEADS">Lead Generation</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Target Audience / Ad Set</label>
                <input
                  type="text"
                  value={newCampaign.adSetName}
                  onChange={(e) => setNewCampaign({ ...newCampaign, adSetName: e.target.value })}
                  placeholder="e.g. India (Age 22-55, Small Business & Agency Owners)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ad Creative Primary Text</label>
                <textarea
                  rows={2}
                  value={newCampaign.primaryText}
                  onChange={(e) => setNewCampaign({ ...newCampaign, primaryText: e.target.value })}
                  placeholder="Primary message shown on Instagram & Facebook feed..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden text-xs"
                />
              </div>

              <button
                onClick={() => {
                  if (!newCampaign.name.trim()) {
                    toast.error('Campaign name is required.', 'Missing Fields');
                    return;
                  }
                  createCampaignMutation.mutate(newCampaign);
                }}
                disabled={createCampaignMutation.isPending}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition"
              >
                {createCampaignMutation.isPending ? 'Publishing to Meta API...' : 'Publish Campaign to Meta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. CREATE REAL INSTANT LEAD FORM MODAL (Section 13, 14) */}
      {isCreateFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Create Meta Instant Lead Form</h3>
              </div>
              <button onClick={() => setIsCreateFormModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Form Name</label>
                <input
                  type="text"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  placeholder="e.g. Inbound Demo Request Form"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Privacy Policy URL</label>
                <input
                  type="text"
                  value={newLeadForm.privacyPolicyUrl}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, privacyPolicyUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="font-bold text-slate-700 block">Lead Questions to Include</label>
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked disabled className="rounded text-purple-600" />
                    <span className="font-bold text-slate-800">Full Name</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked disabled className="rounded text-purple-600" />
                    <span className="font-bold text-slate-800">WhatsApp Phone Number</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked disabled className="rounded text-purple-600" />
                    <span className="font-bold text-slate-800">Email Address</span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!newLeadForm.name.trim()) {
                    toast.error('Form name is required.', 'Missing Fields');
                    return;
                  }
                  createLeadFormMutation.mutate(newLeadForm);
                }}
                disabled={createLeadFormMutation.isPending}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md shadow-purple-500/20 transition"
              >
                {createLeadFormMutation.isPending ? 'Registering on Meta...' : 'Register Form on Meta Page'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. BULK WHATSAPP BROADCAST MODAL */}
      {isBulkBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Bulk WhatsApp Broadcast</h3>
                  <p className="text-[11px] text-slate-500">Dispatch personalized messages to selected Meta leads</p>
                </div>
              </div>
              <button onClick={() => setIsBulkBroadcastModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <span className="font-bold text-emerald-900">Target Recipients:</span>
                <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-black">
                  {selectedLeadIds.length} Leads Selected
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">WhatsApp Message Content</label>
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold">
                    <span>Variables:</span>
                    <button
                      type="button"
                      onClick={() => setBulkMessageText((prev) => prev + ' {{name}}')}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-emerald-700"
                    >
                      + Name
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkMessageText((prev) => prev + ' {{city}}')}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-emerald-700"
                    >
                      + City
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={bulkMessageText}
                  onChange={(e) => setBulkMessageText(e.target.value)}
                  placeholder="Type your WhatsApp message..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs leading-relaxed"
                />
              </div>

              {/* Message Live Preview Bubble */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Live WhatsApp Preview</label>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-slate-800 text-xs font-medium space-y-1 shadow-xs">
                  <p>{bulkMessageText.replace('{{name}}', 'Rahul Sharma').replace('{{city}}', 'Delhi')}</p>
                  <p className="text-[9px] text-slate-400 text-right">12:00 PM ✓✓</p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!bulkMessageText.trim()) {
                    toast.error('Message text cannot be empty.', 'Missing Message');
                    return;
                  }
                  bulkSendBroadcastMutation.mutate({
                    leadIds: selectedLeadIds,
                    messageText: bulkMessageText
                  });
                }}
                disabled={bulkSendBroadcastMutation.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {bulkSendBroadcastMutation.isPending
                    ? 'Dispatching via Queue...'
                    : `Send WhatsApp to ${selectedLeadIds.length} Leads Now`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CONNECT FACEBOOK PAGE MODAL */}
      {isConnectPageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1877F2] flex items-center justify-center">
                  <Facebook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Connect Facebook Page & Meta Ads</h3>
                  <p className="text-[11px] text-slate-500">Capture live Click-to-WhatsApp & Lead Ads leads</p>
                </div>
              </div>
              <button
                onClick={() => setIsConnectPageModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Option 1: Continue with Facebook (Meta OAuth) */}
              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-blue-600 uppercase">Recommended Method</span>
                    <h4 className="text-xs font-black text-slate-900">Meta Facebook Official OAuth</h4>
                    <p className="text-[11px] text-slate-500">Auto-links your Business Pages & Lead Webhooks</p>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-extrabold">AUTO-SYNC</span>
                </div>

                <button
                  onClick={handleFacebookLoginClick}
                  disabled={isConnectingFB}
                  className="w-full py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Facebook className="w-4 h-4" />
                  <span>{isConnectingFB ? 'Connecting...' : 'Connect with Facebook Login'}</span>
                </button>
              </div>

              {/* Option 2: Custom Page Credentials */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase block">Or Enter Facebook Page ID</span>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Facebook Page Name</label>
                  <input
                    type="text"
                    value={customPageName}
                    onChange={(e) => setCustomPageName(e.target.value)}
                    placeholder="e.g. Acme Tech Solutions"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Facebook Page ID</label>
                  <input
                    type="text"
                    value={customPageId}
                    onChange={(e) => setCustomPageId(e.target.value)}
                    placeholder="e.g. 1049968644261349"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Meta Ad Account ID (Optional)</label>
                  <input
                    type="text"
                    value={customAdAccountId}
                    onChange={(e) => setCustomAdAccountId(e.target.value)}
                    placeholder="e.g. act_681426903930095"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <button
                  onClick={() =>
                    connectPageMutation.mutate({
                      pageId: customPageId,
                      pageName: customPageName || activeOrganization?.name || 'Business Page',
                      pageCategory: 'Business & Brand',
                      adAccountId: customAdAccountId
                    })
                  }
                  disabled={connectPageMutation.isPending || !customPageId.trim()}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition"
                >
                  <span>Connect Page</span>
                </button>
              </div>

              {/* Option 3: 1-Click Sandbox Sync */}
              <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-blue-900 block">Authenticate Real Meta Ad Account</span>
                  <span className="text-[10px] text-blue-600">Connects with Meta Cloud Marketing API directly</span>
                </div>
                <button
                  onClick={() => {
                    setIsConnectPageModalOpen(false);
                    setIsUpdateTokenModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1"
                >
                  <Key className="w-3 h-3" />
                  <span>Enter Token</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: UPDATE META TOKEN & REAL AD ACCOUNT CONFIG */}
      {isUpdateTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Connect Real Meta Token & Ad Account</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Syncs authentic lifetime campaigns & leads directly from your Facebook Ad Account</p>
                </div>
              </div>
              <button
                onClick={() => setIsUpdateTokenModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMetaTokenMutation.mutate({
                  accessToken: newTokenValue,
                  adAccountId: newAdAccountIdValue,
                  pageId: newPageIdValue || undefined
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta Access Token / System User Permanent Token <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={newTokenValue}
                  onChange={(e) => setNewTokenValue(e.target.value)}
                  placeholder="Paste your fresh Meta Access Token (e.g. EAAZ...)"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Copy from Meta Graph API Explorer or Meta Business Manager System Users with <span className="font-mono text-blue-600">ads_read, ads_management, pages_show_list, leads_retrieval</span> scopes.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta Ad Account ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAdAccountIdValue}
                  onChange={(e) => setNewAdAccountIdValue(e.target.value)}
                  placeholder="e.g. act_681426903930095"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Facebook Page ID (Optional)
                </label>
                <input
                  type="text"
                  value={newPageIdValue}
                  onChange={(e) => setNewPageIdValue(e.target.value)}
                  placeholder="e.g. 1049968644261349"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateTokenModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMetaTokenMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${updateMetaTokenMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Authenticate & Sync Real Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
