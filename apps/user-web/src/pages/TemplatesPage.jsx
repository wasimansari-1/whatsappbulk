import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Smartphone,
  MessageSquare,
  CornerDownRight,
  RefreshCw,
  Search,
  Grid,
  List,
  ChevronDown,
  MoreVertical,
  Calendar,
  X,
  Bold,
  Italic,
  Strikethrough,
  Smile,
  Code,
  Image as ImageIcon,
  Video,
  File,
  ExternalLink,
  Phone,
  Send,
  Sparkles,
  Eye,
  Check,
  Tag,
  Users,
  Wallet,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Globe,
  Info,
  Lock
} from 'lucide-react';

const META_SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'Hindi (hi)' },
  { code: 'en_US', name: 'English - US (en_US)' },
  { code: 'en_GB', name: 'English - UK (en_GB)' },
  { code: 'gu', name: 'Gujarati (gu)' },
  { code: 'mr', name: 'Marathi (mr)' },
  { code: 'ta', name: 'Tamil (ta)' },
  { code: 'te', name: 'Telugu (te)' },
  { code: 'bn', name: 'Bengali (bn)' },
  { code: 'kn', name: 'Kannada (kn)' },
  { code: 'ml', name: 'Malayalam (ml)' },
  { code: 'pa', name: 'Punjabi (pa)' },
  { code: 'es', name: 'Spanish (es)' },
  { code: 'ar', name: 'Arabic (ar)' },
  { code: 'pt_BR', name: 'Portuguese - BR (pt_BR)' },
  { code: 'fr', name: 'French (fr)' },
  { code: 'de', name: 'German (de)' },
  { code: 'id', name: 'Indonesian (id)' }
];

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // View state: 'LIST' or 'FORM' (Create / Edit)
  const [currentView, setCurrentView] = useState('LIST');
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' or 'TABLE'
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [sendCampaignTemplate, setSendCampaignTemplate] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [syncingTemplateId, setSyncingTemplateId] = useState(null);

  // CREATE / EDIT TEMPLATE FORM STATE (Meta-Native)
  const [formData, setFormData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'hi',
    header: { format: 'NONE', text: '', mediaUrl: '' },
    body: '',
    examples: [],
    footer: '',
    buttons: []
  });

  // SEND CAMPAIGN MODAL FORM STATE
  const [campaignData, setCampaignData] = useState({
    name: '',
    targetTag: 'ALL',
    scheduleEnabled: false,
    scheduleDate: '',
    reattemptEnabled: true,
    testYourself: false
  });

  // Fetch Canonical WhatsApp Connection Status
  const { data: statusRes, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/whatsapp/status')
  });
  const statusData = statusRes?.data || null;
  const isWhatsAppConnected = statusData?.connected === true;

  // 1. Fetch Templates from Database (Strict Multi-Tenant)
  const { data: templatesRes, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/whatsapp/templates'),
    enabled: Boolean(isWhatsAppConnected)
  });

  const templates = templatesRes?.data || [];

  // 2. Fetch Contacts / Tags for Campaign Target Selection
  const { data: contactsRes } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts')
  });
  const contacts = contactsRes?.data?.items || contactsRes?.data || [];

  // 3. Fetch Organization Wallet / Quota
  const { data: walletRes } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/billing/wallet')
  });
  const wallet = walletRes?.data || { balance: 91.13, remainingQuota: 10000 };

  // 4. Sync with Meta Graph API Mutation
  const syncMutation = useMutation({
    mutationFn: async (templateName) => {
      const loadToastId = toast.loading(
        templateName ? `Syncing "${templateName}" with Meta Graph API...` : 'Syncing all templates with Meta WABA...',
        'Meta Cloud API Sync'
      );
      try {
        const res = await api.post('/whatsapp/sync');
        toast.dismiss(loadToastId);
        return res.data;
      } catch (err) {
        toast.dismiss(loadToastId);
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setSyncingTemplateId(null);
      toast.success(
        'Meta Sync complete! Latest approval statuses and categories fetched from Meta servers.',
        'Meta WABA Synced'
      );
    },
    onError: (err) => {
      setSyncingTemplateId(null);
      toast.error(err.response?.data?.message || err.message, 'Meta Sync Failed');
    }
  });

  const [submissionError, setSubmissionError] = useState(null);

  // 5. Submit Template to Meta Graph API
  const submitTemplateMutation = useMutation({
    mutationFn: async (data) => {
      setSubmissionError(null);
      const loadToastId = toast.loading(
        editingTemplateId ? 'Resubmitting template to Meta review engine...' : 'Submitting template to Meta WhatsApp Cloud API...',
        'Meta Submission'
      );
      try {
        const res = editingTemplateId
          ? await api.put(`/whatsapp/templates/${editingTemplateId}`, data)
          : await api.post('/whatsapp/templates', data);
        toast.dismiss(loadToastId);
        return res.data;
      } catch (err) {
        toast.dismiss(loadToastId);
        throw err;
      }
    },
    onSuccess: () => {
      setSubmissionError(null);
      setCurrentView('LIST');
      setEditingTemplateId(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(
        editingTemplateId
          ? 'Template updated and resubmitted to Meta for review.'
          : 'Template submitted to Meta WhatsApp Cloud API! Status is strictly PENDING review by Meta.',
        'Submitted to Meta'
      );
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Meta rejected the template submission.';
      setSubmissionError(msg);
      toast.error(msg, 'Meta Rejection / Error', 8000);
    }
  });

  // 6. Delete Template from Meta Graph API & Database
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const loadToastId = toast.loading('Deleting template from Meta WABA...', 'Deleting');
      try {
        const res = await api.delete(`/whatsapp/templates/${id}`);
        toast.dismiss(loadToastId);
        return res.data;
      } catch (err) {
        toast.dismiss(loadToastId);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted from Meta WABA and database.', 'Template Removed');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message, 'Delete Error');
    }
  });

  // 7. Dispatch Campaign Mutation
  const sendCampaignMutation = useMutation({
    mutationFn: async (payload) => {
      const loadToastId = toast.loading('Queuing campaign broadcast messages...', 'Launching');
      try {
        const res = await api.post('/campaigns', payload);
        toast.dismiss(loadToastId);
        return res.data;
      } catch (err) {
        toast.dismiss(loadToastId);
        throw err;
      }
    },
    onSuccess: () => {
      setSendCampaignTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.success(
        'Campaign broadcast launched! Messages are queued for Meta dispatch.',
        'Campaign Dispatched'
      );
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      toast.error(msg, 'Campaign Failed');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'MARKETING',
      language: 'hi',
      header: { format: 'NONE', text: '', mediaUrl: '' },
      body: '',
      examples: [],
      footer: '',
      buttons: []
    });
  };

  const handleEdit = (tpl) => {
    setEditingTemplateId(tpl._id);
    const headerComp = tpl.components?.find((c) => c.type === 'HEADER');
    const bodyComp = tpl.components?.find((c) => c.type === 'BODY');
    const footerComp = tpl.components?.find((c) => c.type === 'FOOTER');
    const buttonComp = tpl.components?.find((c) => c.type === 'BUTTONS');

    setFormData({
      name: tpl.name,
      category: tpl.category || 'MARKETING',
      language: tpl.language || 'hi',
      header: {
        format: headerComp?.format || 'NONE',
        text: headerComp?.text || '',
        mediaUrl: ''
      },
      body: bodyComp?.text || '',
      examples: bodyComp?.example?.body_text?.[0] || [],
      footer: footerComp?.text || '',
      buttons: buttonComp?.buttons || []
    });
    setCurrentView('FORM');
    setActiveMenuId(null);
  };

  const handleDuplicate = (tpl) => {
    const headerComp = tpl.components?.find((c) => c.type === 'HEADER');
    const bodyComp = tpl.components?.find((c) => c.type === 'BODY');
    const footerComp = tpl.components?.find((c) => c.type === 'FOOTER');
    const buttonComp = tpl.components?.find((c) => c.type === 'BUTTONS');

    setEditingTemplateId(null);
    setFormData({
      name: `${tpl.name}_copy`,
      category: tpl.category || 'MARKETING',
      language: tpl.language || 'hi',
      header: {
        format: headerComp?.format || 'NONE',
        text: headerComp?.text || '',
        mediaUrl: ''
      },
      body: bodyComp?.text || '',
      examples: bodyComp?.example?.body_text?.[0] || [],
      footer: footerComp?.text || '',
      buttons: buttonComp?.buttons || []
    });
    setCurrentView('FORM');
    setActiveMenuId(null);
    toast.info('Template duplicated with suggested unique name. Edit and submit to Meta.', 'Duplicate Template');
  };

  const handleSyncSingle = (tpl) => {
    setSyncingTemplateId(tpl._id);
    syncMutation.mutate(tpl.name);
  };

  // Helper formatting insert
  const handleInsertFormatting = (prefix, suffix) => {
    setFormData((prev) => ({
      ...prev,
      body: prev.body + `${prefix}text${suffix}`
    }));
  };

  const handleAddVariable = () => {
    const count = (formData.body.match(/\{\{\d+\}\}/g) || []).length + 1;
    setFormData((prev) => ({
      ...prev,
      body: prev.body + ` {{${count}}} `,
      examples: [...prev.examples, `SampleVal${count}`]
    }));
  };

  const handleAddButton = (type) => {
    if (formData.buttons.length >= 3) {
      toast.warning('Meta limits templates to a maximum of 3 quick action buttons.', 'Meta Button Limit');
      return;
    }
    const newBtn =
      type === 'QUICK_REPLY'
        ? { type: 'QUICK_REPLY', text: 'Quick Reply' }
        : type === 'URL'
        ? { type: 'URL', text: 'Visit Website', url: 'https://' }
        : type === 'PHONE_NUMBER'
        ? { type: 'PHONE_NUMBER', text: 'Call Us', phoneNumber: '+91' }
        : { type: 'COPY_CODE', text: 'Copy Code', example: 'OFFER2026' };

    setFormData((prev) => ({
      ...prev,
      buttons: [...prev.buttons, newBtn]
    }));
  };

  const handleRemoveButton = (idx) => {
    setFormData((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveTemplate = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Template Name is required.', 'Validation Error');
      return;
    }
    if (!formData.body.trim()) {
      toast.error('Template Body message text is required.', 'Validation Error');
      return;
    }

    // Clean wrapping quotes from body if accidentally pasted
    let cleanBody = formData.body.trim();
    if ((cleanBody.startsWith('"') && cleanBody.endsWith('"')) || (cleanBody.startsWith("'") && cleanBody.endsWith("'"))) {
      cleanBody = cleanBody.slice(1, -1).trim();
    }

    // Meta Naming validation: lowercase letters, numbers, and underscores only
    const cleanName = formData.name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!cleanName || cleanName.length < 1 || cleanName.length > 512) {
      toast.error('Template name must contain only lowercase alphanumeric characters and underscores (e.g. welcome_offer_2026).', 'Meta Naming Rule');
      return;
    }

    submitTemplateMutation.mutate({
      name: cleanName,
      category: formData.category,
      language: formData.language,
      header: formData.header,
      body: { text: cleanBody },
      examples: formData.examples,
      footer: formData.footer ? { text: formData.footer } : undefined,
      buttons: formData.buttons
    });
  };

  const handleLaunchCampaign = (e) => {
    e.preventDefault();
    if (!campaignData.name.trim()) {
      toast.error('Campaign Name is required.', 'Validation Error');
      return;
    }
    sendCampaignMutation.mutate({
      name: campaignData.name,
      templateId: sendCampaignTemplate._id,
      templateName: sendCampaignTemplate.name,
      whatsappPhoneNumberId: statusData?.phoneId || statusData?.phoneNumberId || undefined,
      audienceType: campaignData.targetTag === 'ALL' ? 'ALL' : 'TAGS',
      targetTag: campaignData.targetTag,
      targetTags: campaignData.targetTag !== 'ALL' ? [campaignData.targetTag] : [],
      scheduledAt: campaignData.scheduleEnabled && campaignData.scheduleDate ? new Date(campaignData.scheduleDate).toISOString() : undefined
    });
  };

  // Filter templates
  const filteredTemplates = templates.filter((tpl) => {
    const matchesCategory =
      activeCategoryTab === 'ALL' ||
      tpl.category?.toUpperCase() === activeCategoryTab.toUpperCase();
    const matchesSearch =
      !searchQuery ||
      tpl.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.components?.some((c) => c.text?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate dynamic variables detected in body
  const detectedVariables = (formData.body.match(/\{\{\d+\}\}/g) || []);

  // IF WHATSAPP IS NOT CONNECTED: SHOW CLEAN EXPLICIT CONNECT GATE (Section 24)
  if (!isLoadingStatus && !isWhatsAppConnected) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50/70 p-4 md:p-8">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <FileText className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">WhatsApp Templates</h2>
            <p className="text-xs font-bold text-rose-600">No WhatsApp Business account connected.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed pt-1">
              Connect your WhatsApp Business account to create, manage, and sync official Meta message templates.
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-start space-x-2.5 text-left text-xs font-semibold text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Meta template review and sync requires an active WABA connection verified through Meta Embedded Signup.
            </p>
          </div>

          <a
            href="/integrations"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>Connect WhatsApp Business</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-24">
      {/* 1. SCREEN 1: TEMPLATES GRID & LIST VIEW */}
      {currentView === 'LIST' && (
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>WhatsApp Message Templates</span>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">
                  ({filteredTemplates.length})
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                <span>Meta WhatsApp Cloud API native review, category determination, and real-time sync.</span>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-48 lg:w-64 shadow-xs"
                />
              </div>

              {/* Sync Meta Button */}
              <button
                onClick={() => syncMutation.mutate(null)}
                disabled={syncMutation.isPending}
                className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition"
                title="Sync Authoritative Status from Meta WABA"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin text-emerald-600' : ''}`} />
                <span>Sync with Meta</span>
              </button>

              {/* View Mode Toggle (Grid / Table) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'GRID' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'TABLE' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Create Template Button */}
              <button
                onClick={() => {
                  setEditingTemplateId(null);
                  resetForm();
                  setCurrentView('FORM');
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Template</span>
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 text-xs font-bold">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'MARKETING', label: 'Marketing' },
              { id: 'UTILITY', label: 'Utility' },
              { id: 'AUTHENTICATION', label: 'Authentication' },
              { id: 'CAROUSEL', label: 'Carousel' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryTab(tab.id)}
                className={`px-4 py-2.5 border-b-2 transition ${
                  activeCategoryTab === tab.id
                    ? 'border-emerald-600 text-emerald-600 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'TABLE' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Template Name</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Language</th>
                      <th className="p-3.5">Status (Meta)</th>
                      <th className="p-3.5">Header Type</th>
                      <th className="p-3.5">Buttons</th>
                      <th className="p-3.5">Created At</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTemplates.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-400">
                          No templates found. Click "Create Template" or "Sync with Meta".
                        </td>
                      </tr>
                    ) : (
                      filteredTemplates.map((tpl) => {
                        const headerComp = tpl.components?.find((c) => c.type === 'HEADER');
                        const buttonComp = tpl.components?.find((c) => c.type === 'BUTTONS');
                        const buttonsCount = buttonComp?.buttons?.length || 0;
                        const isApproved = tpl.status === 'APPROVED';

                        return (
                          <tr key={tpl._id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3.5 font-bold text-slate-900">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{tpl.name}</span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                tpl.category === 'UTILITY' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                {tpl.category || 'Marketing'}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] font-bold text-slate-700">
                              {tpl.language || 'hi'}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border inline-flex items-center space-x-1 ${
                                isApproved
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : tpl.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  isApproved ? 'bg-emerald-500' : tpl.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'
                                }`} />
                                <span>{isApproved ? 'Approved' : tpl.status === 'REJECTED' ? 'Rejected' : 'Pending'}</span>
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500">
                              {headerComp?.format && headerComp.format !== 'NONE' ? headerComp.format : 'Text'}
                            </td>
                            <td className="p-3.5 text-slate-500 font-bold">
                              {buttonsCount > 0 ? `${buttonsCount} Button(s)` : 'None'}
                            </td>
                            <td className="p-3.5 text-slate-400 text-[11px]">
                              {new Date(tpl.createdAt || Date.now()).toLocaleDateString()}
                            </td>
                            <td className="p-3.5 text-right space-x-1.5">
                              {/* Sync Single Button */}
                              <button
                                onClick={() => handleSyncSingle(tpl)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                title="Sync with Meta"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncingTemplateId === tpl._id ? 'animate-spin text-emerald-600' : ''}`} />
                              </button>

                              <button
                                onClick={() => setPreviewTemplate(tpl)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                              >
                                Preview
                              </button>

                              {/* Send Button: Disabled if NOT Approved */}
                              <button
                                onClick={() => {
                                  if (!isApproved) {
                                    toast.warning('Template must be approved by Meta before launching broadcast campaigns.', 'Meta Approval Required');
                                    return;
                                  }
                                  setSendCampaignTemplate(tpl);
                                  setCampaignData({
                                    name: `${tpl.name}_broadcast_${new Date().toISOString().substring(0, 10)}`,
                                    targetTag: 'ALL',
                                    scheduleEnabled: false,
                                    scheduleDate: '',
                                    reattemptEnabled: true,
                                    testYourself: false
                                  });
                                }}
                                disabled={!isApproved}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex-inline items-center space-x-1 ${
                                  isApproved
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                }`}
                                title={isApproved ? 'Send Campaign Broadcast' : 'Meta Approval Required to Send'}
                              >
                                {!isApproved && <Lock className="w-2.5 h-2.5 inline mr-1" />}
                                <span>Send</span>
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
          )}

          {/* GRID OF TEMPLATES */}
          {viewMode === 'GRID' && (
            isLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-semibold">Loading Meta templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Templates Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create your first Meta WhatsApp message template or click Sync with Meta to fetch existing approved templates.
                </p>
                <button
                  onClick={() => {
                    setEditingTemplateId(null);
                    resetForm();
                    setCurrentView('FORM');
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  + Create New Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredTemplates.map((tpl) => {
                  const bodyComp = tpl.components?.find((c) => c.type === 'BODY');
                  const headerComp = tpl.components?.find((c) => c.type === 'HEADER');
                  const isUtility = tpl.category === 'UTILITY';
                  const isApproved = tpl.status === 'APPROVED';
                  const initialLetter = (tpl.name || 'T')[0].toUpperCase();

                  return (
                    <div
                      key={tpl._id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3 relative group"
                    >
                      {/* Top Row: Category Pill, Meta Status Badge & Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              isUtility
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {tpl.category || 'Marketing'}
                          </span>

                          {/* Real Meta Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border flex items-center space-x-1 ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : tpl.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isApproved
                                  ? 'bg-emerald-500'
                                  : tpl.status === 'REJECTED'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span>{isApproved ? 'Approved' : tpl.status === 'REJECTED' ? 'Rejected' : 'Pending'}</span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {/* Dedicated Single Sync Button */}
                          <button
                            onClick={() => handleSyncSingle(tpl)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition"
                            title="Sync this template from Meta"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingTemplateId === tpl._id ? 'animate-spin text-emerald-600' : ''}`} />
                          </button>

                          {/* 3-Dots Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(activeMenuId === tpl._id ? null : tpl._id)}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuId === tpl._id && (
                              <div className="absolute right-0 top-6 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20 text-xs font-semibold divide-y divide-slate-50">
                                <button
                                  onClick={() => handleEdit(tpl)}
                                  className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-50 text-slate-700 text-left"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Edit Template</span>
                                </button>
                                <button
                                  onClick={() => handleDuplicate(tpl)}
                                  className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-50 text-slate-700 text-left"
                                >
                                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Duplicate</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete template "${tpl.name}" from Meta and database?`)) {
                                      deleteMutation.mutate(tpl._id);
                                      setActiveMenuId(null);
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-rose-50 text-rose-600 text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Icon & Title */}
                      <div className="flex items-start space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                          {initialLetter}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={tpl.name}>
                            {tpl.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                            <FileText className="w-2.5 h-2.5" />
                            <span>{headerComp?.format && headerComp.format !== 'NONE' ? `${headerComp.format} Template` : 'Text Template'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Message Preview Snippet */}
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                        {bodyComp?.text || 'No message content defined.'}
                      </p>

                      {/* Rejection Note if Rejected by Meta */}
                      {tpl.status === 'REJECTED' && tpl.rejectionReason && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-700 flex items-start space-x-1">
                          <AlertCircle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                          <span><strong>Meta Rejection:</strong> {tpl.rejectionReason}</span>
                        </div>
                      )}

                      {/* Bottom Action Bar: Date on Left, Preview & Send on Right */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(tpl.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setPreviewTemplate(tpl)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                          >
                            Preview
                          </button>

                          {/* Send Button: Disabled if NOT APPROVED */}
                          <button
                            onClick={() => {
                              if (!isApproved) {
                                toast.warning('Template must be approved by Meta before sending broadcast campaigns.', 'Meta Approval Required');
                                return;
                              }
                              setSendCampaignTemplate(tpl);
                              setCampaignData({
                                name: `${tpl.name}_broadcast_${new Date().toISOString().substring(0, 10)}`,
                                targetTag: 'ALL',
                                scheduleEnabled: false,
                                scheduleDate: '',
                                reattemptEnabled: true,
                                testYourself: false
                              });
                            }}
                            disabled={!isApproved}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
                              isApproved
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                            title={isApproved ? 'Send Campaign Broadcast' : 'Meta Approval Required to Send'}
                          >
                            {!isApproved && <Lock className="w-2.5 h-2.5 mr-0.5" />}
                            <span>Send</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* 2. SCREEN 2: CREATE / EDIT TEMPLATE FORM (Meta-Native Builder) */}
      {currentView === 'FORM' && (
        <div className="space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
              <button onClick={() => setCurrentView('LIST')} className="hover:text-emerald-600 transition">
                Templates
              </button>
              <span>/</span>
              <span className="text-slate-900 font-extrabold">{editingTemplateId ? 'Edit Template' : 'Create Template'}</span>
            </div>

            <button
              onClick={() => setCurrentView('LIST')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: FORM FIELDS (8 cols) */}
            <form onSubmit={handleSaveTemplate} className="lg:col-span-8 space-y-6">
              {/* CARD 1: Basic Info */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Basic Info</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Template Name */}
                  <div className="space-y-1 md:col-span-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <label>Template Name *</label>
                      <span className="text-[10px] text-slate-400 font-mono">({formData.name.length}/512)</span>
                    </div>
                    <input
                      type="text"
                      disabled={Boolean(editingTemplateId)}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                      placeholder="e.g. welcome_offer_2026"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Lowercase letters, numbers & underscores only</span>
                  </div>

                  {/* Template Category */}
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-xs font-bold text-slate-700 block">Template Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="MARKETING">Marketing (Promotions & Offers)</option>
                      <option value="UTILITY">Utility (Order, Account & Alert)</option>
                      <option value="AUTHENTICATION">Authentication (OTP & Passwords)</option>
                    </select>
                  </div>

                  {/* Template Language */}
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-xs font-bold text-slate-700 block">Template Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      {META_SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* CARD 2: Content (Header, Body, Footer) */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Content</h3>

                {/* Header Options */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Header (Optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'NONE', label: 'None' },
                      { id: 'TEXT', label: 'Text' },
                      { id: 'IMAGE', label: 'Image' },
                      { id: 'VIDEO', label: 'Video' },
                      { id: 'DOCUMENT', label: 'Document' }
                    ].map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, header: { ...formData.header, format: h.id } })}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                          formData.header.format === h.id
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>

                  {formData.header.format === 'TEXT' && (
                    <input
                      type="text"
                      value={formData.header.text}
                      onChange={(e) => setFormData({ ...formData, header: { ...formData.header, text: e.target.value } })}
                      placeholder="Enter header text..."
                      className="w-full mt-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>

                {/* Body Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <label>Body *</label>
                    <span className="text-[10px] text-slate-400 font-mono">({formData.body.length}/1024)</span>
                  </div>

                  <textarea
                    rows={6}
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Type your WhatsApp message body text here... Use {{1}}, {{2}} for dynamic customer parameters."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs leading-relaxed font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />

                  {/* Rich Text & Variable Formatting Toolbar */}
                  <div className="flex items-center justify-between p-2 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleAddVariable}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 rounded-lg text-xs font-bold shadow-xs transition"
                        title="Add {{1}} Dynamic Parameter"
                      >
                        {`{ }`} Add Variable
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInsertFormatting('*', '*')}
                        className="p-1.5 hover:bg-white rounded-lg transition"
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInsertFormatting('_', '_')}
                        className="p-1.5 hover:bg-white rounded-lg transition"
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInsertFormatting('~', '~')}
                        className="p-1.5 hover:bg-white rounded-lg transition"
                        title="Strikethrough"
                      >
                        <Strikethrough className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400">Meta Emojis & Markdown Supported</span>
                  </div>
                </div>

                {/* Variable Samples Manager (Meta Requirement for Review) */}
                {detectedVariables.length > 0 && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Meta Variable Sample Values ({detectedVariables.length} detected)</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Meta reviewers require realistic sample values to approve templates with dynamic variables.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detectedVariables.map((v, i) => (
                        <div key={i} className="space-y-1">
                          <label className="text-[11px] font-bold text-emerald-800 font-mono">Sample for {v}</label>
                          <input
                            type="text"
                            value={formData.examples[i] || ''}
                            onChange={(e) => {
                              const updated = [...formData.examples];
                              updated[i] = e.target.value;
                              setFormData({ ...formData, examples: updated });
                            }}
                            placeholder={`e.g. ${i === 0 ? 'Wasim' : '₹ 500'}`}
                            className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-semibold focus:outline-hidden"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <label>Footer (Optional)</label>
                    <span className="text-[10px] text-slate-400 font-mono">({(formData.footer || '').length}/60)</span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    value={formData.footer}
                    onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                    placeholder="e.g. Reply STOP to unsubscribe"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* CARD 3: Buttons */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Buttons</h3>
                    <p className="text-[11px] text-slate-500">Create interactive buttons supported by Meta WhatsApp Cloud API.</p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAddButton('QUICK_REPLY')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      + Quick Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddButton('URL')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      + URL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddButton('PHONE_NUMBER')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      + Phone
                    </button>
                  </div>
                </div>

                {formData.buttons.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No action buttons added. Click above to add Quick Replies or URL buttons.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.buttons.map((btn, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3 text-xs">
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono text-[10px] font-bold text-slate-600">
                          {btn.type}
                        </span>

                        <input
                          type="text"
                          maxLength={25}
                          value={btn.text || ''}
                          onChange={(e) => {
                            const updated = [...formData.buttons];
                            updated[idx].text = e.target.value;
                            setFormData({ ...formData, buttons: updated });
                          }}
                          placeholder="Button Text (e.g. Track Order)"
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                        />

                        {btn.type === 'URL' && (
                          <input
                            type="text"
                            value={btn.url || ''}
                            onChange={(e) => {
                              const updated = [...formData.buttons];
                              updated[idx].url = e.target.value;
                              setFormData({ ...formData, buttons: updated });
                            }}
                            placeholder="https://yourwebsite.com"
                            className="w-48 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        )}

                        {btn.type === 'PHONE_NUMBER' && (
                          <input
                            type="text"
                            value={btn.phoneNumber || ''}
                            onChange={(e) => {
                              const updated = [...formData.buttons];
                              updated[idx].phoneNumber = e.target.value;
                              setFormData({ ...formData, buttons: updated });
                            }}
                            placeholder="+919199800309"
                            className="w-40 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        )}

                        <span className="text-[10px] text-slate-400 font-mono">({(btn.text || '').length}/25)</span>

                        <button
                          type="button"
                          onClick={() => handleRemoveButton(idx)}
                          className="p-1 hover:bg-rose-100 rounded-lg text-rose-500 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline Meta Error Banner */}
              {submissionError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-900 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-rose-800">Meta WhatsApp Cloud API Rejection / Notice</h5>
                    <p className="text-xs text-rose-700 font-medium leading-relaxed font-mono break-all">{submissionError}</p>
                  </div>
                </div>
              )}

              {/* Submit to Meta for Review */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={submitTemplateMutation.isPending}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/25 transition flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitTemplateMutation.isPending ? 'Submitting to Meta...' : editingTemplateId ? 'Update & Resubmit to Meta' : 'Submit to Meta for Review'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentView('LIST')}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* RIGHT COLUMN: STICKY LIVE WHATSAPP DEVICE PREVIEW (Buttons attached INSIDE the bubble) */}
            <div className="lg:col-span-4 sticky top-6">
              <div className="bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 max-w-sm mx-auto">
                {/* Phone Notch */}
                <div className="w-32 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />

                {/* WhatsApp Chat Container */}
                <div className="bg-[#EFEAE2] rounded-[32px] overflow-hidden min-h-[480px] flex flex-col justify-between shadow-inner">
                  {/* WhatsApp Top Bar */}
                  <div className="bg-[#075E54] text-white p-3 flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs border border-white/20">
                      T
                    </div>
                    <div>
                      <h5 className="text-xs font-bold leading-tight">IGlobal Tech</h5>
                      <span className="text-[9px] text-emerald-200 block">WhatsApp Business Account</span>
                    </div>
                  </div>

                  {/* Message Bubble Feed */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-end">
                    <div className="bg-white rounded-2xl rounded-tl-none shadow-sm overflow-hidden text-xs text-slate-900 border border-slate-200/50">
                      <div className="p-3.5 space-y-2">
                        {/* Header Preview */}
                        {formData.header.format === 'TEXT' && formData.header.text && (
                          <h4 className="font-extrabold text-xs text-slate-900">{formData.header.text}</h4>
                        )}

                        {/* Body Preview with Sample Values */}
                        <p className="leading-relaxed whitespace-pre-line text-slate-800 text-xs">
                          {formData.body
                            ? formData.body.replace(/\{\{(\d+)\}\}/g, (_, idx) => {
                                const num = parseInt(idx, 10) - 1;
                                return formData.examples[num] || `{{${idx}}}`;
                              })
                            : 'Type message body to preview here...'}
                        </p>

                        {/* Footer Preview */}
                        {formData.footer && (
                          <p className="text-[10px] text-slate-400 font-medium pt-1">{formData.footer}</p>
                        )}

                        {/* Timestamp */}
                        <div className="text-[9px] text-slate-400 text-right">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Interactive Buttons attached INSIDE the Message Bubble */}
                      {formData.buttons.length > 0 && (
                        <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
                          {formData.buttons.map((btn, idx) => (
                            <div
                              key={idx}
                              className="py-2.5 px-3 text-center text-xs font-bold text-blue-600 flex items-center justify-center space-x-1.5 hover:bg-slate-100/60 transition"
                            >
                              {btn.type === 'URL' && <ExternalLink className="w-3 h-3 text-blue-500" />}
                              {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3 text-blue-500" />}
                              {btn.type === 'COPY_CODE' && <Copy className="w-3 h-3 text-blue-500" />}
                              {btn.type === 'QUICK_REPLY' && <CornerDownRight className="w-3 h-3 text-blue-500" />}
                              <span>{btn.text || 'Action Button'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp Bottom Fake Input */}
                  <div className="p-2.5 bg-[#F0F2F5] border-t border-slate-200/60 flex items-center space-x-2">
                    <div className="flex-1 bg-white py-1.5 px-3 rounded-full text-[11px] text-slate-400">
                      Message
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SCREEN 3: TEMPLATE PREVIEW DRAWER (Buttons inside bubble) */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-slate-900">Template Preview</h3>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border flex items-center space-x-1 ${
                    previewTemplate.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : previewTemplate.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      previewTemplate.status === 'APPROVED'
                        ? 'bg-emerald-500'
                        : previewTemplate.status === 'REJECTED'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span>{previewTemplate.status === 'APPROVED' ? 'Approved' : previewTemplate.status === 'REJECTED' ? 'Rejected' : 'Pending Review'}</span>
                </span>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Device Mockup in Drawer */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
              <div className="bg-[#EFEAE2] rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3">
                <div className="bg-white rounded-2xl rounded-tl-none shadow-xs overflow-hidden text-xs">
                  <div className="p-3.5 space-y-2">
                    <h4 className="font-extrabold text-slate-900">{previewTemplate.name}</h4>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                      {previewTemplate.components?.find((c) => c.type === 'BODY')?.text || ''}
                    </p>
                    <span className="text-[9px] text-slate-400 block text-right">Apr 22, 2026</span>
                  </div>

                  {/* Buttons attached inside the bubble */}
                  {previewTemplate.components?.find((c) => c.type === 'BUTTONS')?.buttons?.length > 0 && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
                      {previewTemplate.components?.find((c) => c.type === 'BUTTONS')?.buttons?.map((btn, i) => (
                        <div
                          key={i}
                          className="py-2.5 px-3 text-center text-xs font-bold text-blue-600 flex items-center justify-center space-x-1.5"
                        >
                          <CornerDownRight className="w-3 h-3 text-blue-500" />
                          <span>{btn.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Template Metadata */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-bold text-slate-800">{previewTemplate.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Language:</span>
                  <span className="font-bold text-slate-800">{previewTemplate.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Meta Template ID:</span>
                  <span className="font-mono text-[11px] font-bold text-slate-700">{previewTemplate.providerTemplateId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created At:</span>
                  <span className="font-bold text-slate-800">
                    {new Date(previewTemplate.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Action Bar (Send disabled if NOT APPROVED) */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center space-x-2">
              <button
                onClick={() => {
                  if (previewTemplate.status !== 'APPROVED') {
                    toast.warning('Template must be approved by Meta before launching broadcast campaigns.', 'Meta Approval Required');
                    return;
                  }
                  const tpl = previewTemplate;
                  setPreviewTemplate(null);
                  setSendCampaignTemplate(tpl);
                }}
                disabled={previewTemplate.status !== 'APPROVED'}
                className={`flex-1 py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-2 transition ${
                  previewTemplate.status === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                {previewTemplate.status === 'APPROVED' ? <Send className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>{previewTemplate.status === 'APPROVED' ? 'Send Campaign' : 'Meta Approval Required'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SCREEN 4: CREATE CAMPAIGN QUICK LAUNCH MODAL */}
      {sendCampaignTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 space-y-6 p-6 md:p-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-black text-slate-900">Create Campaigns</h2>
              <button
                onClick={() => setSendCampaignTemplate(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Top KPI Boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Remaining Quota</span>
                <p className="text-base font-extrabold text-slate-900 mt-1">10000</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Selected Customers</span>
                <p className="text-base font-extrabold text-slate-900 mt-1">{contacts.length}</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Wallet Amount</span>
                <p className="text-base font-extrabold text-emerald-700 mt-1">₹ 91.13</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Estimated Amount</span>
                <p className="text-base font-extrabold text-slate-900 mt-1">₹ {(contacts.length * 0.48).toFixed(2)}</p>
              </div>
            </div>

            {/* Main Form & Preview Columns */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form (7 cols) */}
              <form onSubmit={handleLaunchCampaign} className="md:col-span-7 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Campaign Name *</label>
                  <input
                    type="text"
                    value={campaignData.name}
                    onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                    placeholder="Enter campaign title..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Select Number *</label>
                    <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                      {isWhatsAppConnected
                        ? `${statusData?.businessName || 'WhatsApp Business'} (${statusData?.displayPhoneNumber})`
                        : 'No WhatsApp Number Connected'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Select Broadcast Target *</label>
                    <select
                      value={campaignData.targetTag}
                      onChange={(e) => setCampaignData({ ...campaignData, targetTag: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="ALL">All Contacts ({contacts.length})</option>
                      <option value="VIP">VIP Customers</option>
                      <option value="NEW_LEADS">New Leads</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Options Toggles */}
                <div className="pt-2 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Advanced Options</span>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">Schedule Date & Time</p>
                      <p className="text-[10px] text-slate-400">Schedule your campaign to be sent at a specific date.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={campaignData.scheduleEnabled}
                      onChange={(e) => setCampaignData({ ...campaignData, scheduleEnabled: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">Reattempt Failed Messages</p>
                      <p className="text-[10px] text-slate-400">Automatically retry when recipients are unreachable.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={campaignData.reattemptEnabled}
                      onChange={(e) => setCampaignData({ ...campaignData, reattemptEnabled: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendCampaignMutation.isPending}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendCampaignMutation.isPending ? 'Launching Broadcast...' : 'Send 🚀'}</span>
                </button>
              </form>

              {/* Right Column: Template Mockup in Modal */}
              <div className="md:col-span-5 bg-[#EFEAE2] rounded-3xl p-4 border border-slate-200 space-y-3">
                <div className="bg-white rounded-2xl rounded-tl-none shadow-xs overflow-hidden text-xs">
                  <div className="p-3.5 space-y-2">
                    <h4 className="font-extrabold text-slate-900">{sendCampaignTemplate.name}</h4>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                      {sendCampaignTemplate.components?.find((c) => c.type === 'BODY')?.text || ''}
                    </p>
                    <span className="text-[9px] text-slate-400 block text-right">Apr 22, 2026</span>
                  </div>

                  {sendCampaignTemplate.components?.find((c) => c.type === 'BUTTONS')?.buttons?.length > 0 && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
                      {sendCampaignTemplate.components?.find((c) => c.type === 'BUTTONS')?.buttons?.map((btn, i) => (
                        <div
                          key={i}
                          className="py-2.5 px-3 text-center text-xs font-bold text-blue-600 flex items-center justify-center space-x-1.5"
                        >
                          <CornerDownRight className="w-3 h-3 text-blue-500" />
                          <span>{btn.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
