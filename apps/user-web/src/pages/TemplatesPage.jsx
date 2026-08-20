import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  FileText,
  Plus,
  Trash2,
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
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // View state: 'LIST' or 'CREATE'
  const [currentView, setCurrentView] = useState('LIST');
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' or 'TABLE'
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // CREATE TEMPLATE FORM STATE (Matching Screenshot 2)
  const [formData, setFormData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en_US',
    header: { format: 'NONE', text: '', mediaUrl: '' },
    body: '',
    footer: '',
    buttons: []
  });

  // 1. Fetch Templates from Database
  const { data: templatesRes, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/whatsapp/templates')
  });

  const templates = templatesRes?.data || [];

  // 2. Sync with Meta Graph API
  const syncMutation = useMutation({
    mutationFn: () => api.post('/whatsapp/sync'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert(`Synced with Meta! Total ${res.data?.syncedTemplates || templates.length} templates fetched with real-time approval status from Meta.`);
    },
    onError: (err) => alert(`Meta Sync error: ${err.message}`)
  });

  // 3. Submit Template to Meta Graph API
  const createMutation = useMutation({
    mutationFn: (data) =>
      api.post('/whatsapp/templates', {
        name: data.name,
        category: data.category,
        language: data.language,
        header: data.header,
        body: { text: data.body },
        footer: data.footer ? { text: data.footer } : undefined,
        buttons: data.buttons
      }),
    onSuccess: () => {
      setCurrentView('LIST');
      setFormData({
        name: '',
        category: 'MARKETING',
        language: 'en_US',
        header: { format: 'NONE', text: '', mediaUrl: '' },
        body: '',
        footer: '',
        buttons: []
      });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert('Template submitted to Meta Graph API! Status is now PENDING review by Meta.');
    },
    onError: (err) => alert(err?.error?.message || err?.message || 'Error submitting template to Meta')
  });

  // 4. Delete Template
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/whatsapp/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    }
  });

  // Filter templates by category and search
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

  // Helper to add variable to body
  const handleAddVariable = () => {
    const count = (formData.body.match(/\{\{\d+\}\}/g) || []).length + 1;
    setFormData({ ...formData, body: formData.body + ` {{${count}}} ` });
  };

  // Helper to add button
  const handleAddButton = (type) => {
    if (formData.buttons.length >= 3) {
      alert('Meta allows maximum 3 Quick Reply / CTA buttons per template.');
      return;
    }
    const newBtn = {
      type,
      text: type === 'QUICK_REPLY' ? 'Quick Reply' : type === 'URL' ? 'Visit Website' : 'Call Now',
      url: type === 'URL' ? 'https://' : '',
      phoneNumber: type === 'PHONE_NUMBER' ? '+91' : ''
    };
    setFormData({ ...formData, buttons: [...formData.buttons, newBtn] });
  };

  // Helper to remove button
  const handleRemoveButton = (index) => {
    const updated = formData.buttons.filter((_, idx) => idx !== index);
    setFormData({ ...formData, buttons: updated });
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* VIEW 1: ALL TEMPLATES LIST (Matching Screenshot 1) */}
      {currentView === 'LIST' ? (
        <div className="space-y-6">
          {/* Top Category Tabs */}
          <div className="flex items-center space-x-6 border-b border-slate-200 text-xs font-semibold">
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
                className={`pb-2.5 transition relative ${
                  activeCategoryTab === tab.id
                    ? 'text-emerald-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {activeCategoryTab === tab.id && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Subheader & Search / Sync / Create Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-base font-extrabold text-slate-900">
              All Templates <span className="text-slate-400 font-normal">({filteredTemplates.length})</span>
            </h1>

            <div className="flex items-center space-x-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs outline-none shadow-xs w-48 lg:w-64"
                />
              </div>

              {/* Live Meta Sync Button */}
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition"
                title="Sync live status and categories from Meta Graph API"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                <span>{syncMutation.isPending ? 'Syncing...' : 'Sync'}</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'TABLE' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'GRID' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Create Template Button */}
              <button
                onClick={() => setCurrentView('CREATE')}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
              >
                <span>Create Template</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* TEMPLATE CARDS GRID (Matching Screenshot 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No message templates found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click [Create Template] to submit a new template to Meta, or click [Sync] to fetch approved templates from your Meta WABA.
                </p>
              </div>
            ) : (
              filteredTemplates.map((tpl) => {
                const header = tpl.components?.find((c) => c.type === 'HEADER');
                const body = tpl.components?.find((c) => c.type === 'BODY')?.text || '';
                const buttons = tpl.components?.find((c) => c.type === 'BUTTONS')?.buttons || [];
                const isUtility = tpl.category === 'UTILITY';
                const isPending = tpl.status === 'PENDING';
                const isRejected = tpl.status === 'REJECTED';

                const avatarLetter = (tpl.name || 'T')[0].toUpperCase();

                return (
                  <div
                    key={tpl._id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition space-y-3"
                  >
                    <div className="space-y-2.5">
                      {/* Top Category Badge & 3-dots Menu */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isUtility ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {tpl.category === 'UTILITY' ? 'Utility' : 'Marketing'}
                          </span>

                          {/* Approval Status Badge */}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isPending && <Clock className="w-2.5 h-2.5" />}
                            {tpl.status || 'PENDING'}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            if (confirm(`Delete template "${tpl.name}" from Meta?`)) {
                              deleteMutation.mutate(tpl._id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Avatar Letter + Name & Type */}
                      <div className="flex items-start space-x-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isUtility
                              ? 'bg-amber-100/60 text-amber-800'
                              : 'bg-purple-100/60 text-purple-800'
                          }`}
                        >
                          {avatarLetter}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 truncate" title={tpl.name}>
                            {tpl.name}
                          </h3>
                          <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <FileText className="w-2.5 h-2.5" />
                            <span>{header?.format === 'VIDEO' ? 'Video Template' : 'Text Template'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Body Text Snippet */}
                      <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3 min-h-[3.3rem]">
                        {body}
                      </p>
                    </div>

                    {/* Bottom Date & Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {tpl.createdAt
                            ? new Date(tpl.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                            : 'Aug 20'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setPreviewTemplate(tpl)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition"
                        >
                          Preview
                        </button>

                        <button
                          onClick={() => navigate('/campaigns')}
                          disabled={isPending || isRejected}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center space-x-1"
                        >
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: CREATE TEMPLATE 2-COLUMN VIEW (Matching Screenshot 2) */
        <div className="space-y-6">
          {/* Breadcrumb & Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-1 text-xs text-slate-400">
                <button onClick={() => setCurrentView('LIST')} className="hover:underline">
                  Wappbiz Templates
                </button>
                <span>/</span>
                <span className="text-slate-600 font-semibold">New Template</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">Create Template</h1>
            </div>

            <button
              onClick={() => setCurrentView('LIST')}
              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold"
            >
              Back to Templates
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: FORM CARDS (8 Cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* Card 1: Basic Info */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-800">Basic Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Template Name */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                      <span>Template Name 🛈</span>
                      <span className="text-[10px] text-slate-400 font-normal">{formData.name.length}/512</span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Template Name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                        })
                      }
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-mono"
                    />
                  </div>

                  {/* Template Category */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Template Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>

                  {/* Template Language */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Template Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    >
                      <option value="en_US">English (en_US)</option>
                      <option value="hi">Hindi (hi)</option>
                      <option value="es">Spanish (es)</option>
                      <option value="ar">Arabic (ar)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2: Content (Header, Body, Footer) */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-800">Content</h3>

                {/* Header Selector Pills */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Header 🛈</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'NONE', label: 'None', icon: Check },
                      { id: 'TEXT', label: 'Text', icon: FileText },
                      { id: 'IMAGE', label: 'Image', icon: ImageIcon },
                      { id: 'VIDEO', label: 'Video', icon: Video },
                      { id: 'DOCUMENT', label: 'Document', icon: File }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            header: { ...formData.header, format: opt.id }
                          })
                        }
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          formData.header.format === opt.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <opt.icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  {formData.header.format === 'TEXT' && (
                    <input
                      type="text"
                      placeholder="Header Text (e.g. Exclusive Offer For You! 🎁)"
                      value={formData.header.text}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          header: { ...formData.header, text: e.target.value }
                        })
                      }
                      className="w-full mt-2 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                    />
                  )}
                </div>

                {/* Body Textarea with Toolbar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                    <span>Body</span>
                    <span className="text-[10px] text-slate-400 font-normal">{formData.body.length}/1024</span>
                  </div>
                  <textarea
                    rows="5"
                    required
                    placeholder="Add Content (e.g. Hi {{1}}, welcome to our store! Here is your 20% discount code: {{2}})"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-brand-500 leading-relaxed"
                  />

                  {/* Formatting Toolbar */}
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
                    <button
                      type="button"
                      onClick={handleAddVariable}
                      className="p-1.5 hover:bg-white text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                      title="Add Variable {{1}}"
                    >
                      <Code className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[10px]">Variable</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, body: formData.body + ' 😊' })}
                      className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
                      title="Emoji"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, body: formData.body + ' *bold text* ' })}
                      className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, body: formData.body + ' _italic text_ ' })}
                      className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, body: formData.body + ' ~strikethrough~ ' })}
                      className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
                      title="Strikethrough"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Footer (Optional) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                    <span>Footer (Optional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">{formData.footer.length}/60</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Add Footer (e.g. Reply STOP to unsubscribe)"
                    value={formData.footer}
                    onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Card 3: Buttons */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-800">Buttons</h3>
                  <p className="text-[11px] text-slate-400">
                    Create buttons that let the customer respond to your message or take actions
                  </p>
                </div>

                {/* Action Buttons to Add */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddButton('QUICK_REPLY')}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    + Quick Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddButton('URL')}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    + URL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddButton('PHONE_NUMBER')}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    + Phone Number
                  </button>
                </div>

                {/* Added Buttons List */}
                {formData.buttons.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {formData.buttons.map((btn, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-2 flex-1">
                          <span className="text-[10px] font-bold uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                            {btn.type}
                          </span>
                          <input
                            type="text"
                            value={btn.text}
                            onChange={(e) => {
                              const updated = [...formData.buttons];
                              updated[idx].text = e.target.value;
                              setFormData({ ...formData, buttons: updated });
                            }}
                            className="p-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none flex-1"
                            placeholder="Button Title (Max 20 chars)"
                            maxLength={20}
                          />
                          {btn.type === 'URL' && (
                            <input
                              type="text"
                              value={btn.url}
                              onChange={(e) => {
                                const updated = [...formData.buttons];
                                updated[idx].url = e.target.value;
                                setFormData({ ...formData, buttons: updated });
                              }}
                              className="p-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none flex-1 font-mono"
                              placeholder="https://yourwebsite.com"
                            />
                          )}
                          {btn.type === 'PHONE_NUMBER' && (
                            <input
                              type="text"
                              value={btn.phoneNumber}
                              onChange={(e) => {
                                const updated = [...formData.buttons];
                                updated[idx].phoneNumber = e.target.value;
                                setFormData({ ...formData, buttons: updated });
                              }}
                              className="p-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none flex-1 font-mono"
                              placeholder="+919876543210"
                            />
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveButton(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions: Save as Draft / Finish */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('LIST')}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs font-bold transition"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={createMutation.isPending || !formData.name || !formData.body}
                  onClick={() => createMutation.mutate(formData)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/25 transition flex items-center space-x-1.5"
                >
                  <span>{createMutation.isPending ? 'Submitting to Meta...' : 'Finish & Submit to Meta'}</span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: STICKY WHATSAPP MOBILE LIVE PREVIEW (4 Cols) */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                {/* WhatsApp Chat Header */}
                <div className="bg-[#075e54] text-white p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                      💬
                    </div>
                    <div>
                      <p className="text-xs font-bold">Arvee Appliances</p>
                      <p className="text-[9px] text-emerald-200">Business Account</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-white/80">
                    <Phone className="w-3.5 h-3.5" />
                    <MoreVertical className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* WhatsApp Chat Wallpaper & Reactive Bubble */}
                <div className="p-4 whatsapp-chat-bg min-h-[380px] flex flex-col justify-center">
                  {!formData.body && formData.header.format === 'NONE' ? (
                    <div className="text-center text-xs text-slate-400 font-medium py-16">
                      No preview available
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-3.5 shadow-md space-y-2 max-w-[280px] self-start border border-slate-100 animate-in fade-in">
                      {/* Header Preview */}
                      {formData.header.format === 'TEXT' && formData.header.text && (
                        <p className="font-bold text-slate-900 text-xs">{formData.header.text}</p>
                      )}
                      {formData.header.format === 'IMAGE' && (
                        <div className="h-28 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-[10px]">
                          🖼 [Image Header]
                        </div>
                      )}

                      {/* Body Preview */}
                      <p className="text-slate-800 text-xs whitespace-pre-wrap leading-relaxed">
                        {formData.body}
                      </p>

                      {/* Footer Preview */}
                      {formData.footer && (
                        <p className="text-[10px] text-slate-400 pt-1">{formData.footer}</p>
                      )}

                      {/* Buttons Preview */}
                      {formData.buttons.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          {formData.buttons.map((btn, idx) => (
                            <div
                              key={idx}
                              className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-center text-xs font-semibold text-emerald-700 flex items-center justify-center space-x-1"
                            >
                              {btn.type === 'URL' && <ExternalLink className="w-3 h-3 text-emerald-600" />}
                              {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3 text-emerald-600" />}
                              <span>{btn.text || 'Button'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW TEMPLATE */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="whatsapp-chat-bg p-4 rounded-2xl">
              <div className="bg-white p-3.5 rounded-2xl shadow-sm space-y-2 text-xs">
                <p className="font-bold text-slate-800">
                  {previewTemplate.components?.find((c) => c.type === 'HEADER')?.text || ''}
                </p>
                <p className="whitespace-pre-line text-slate-700 leading-relaxed">
                  {previewTemplate.components?.find((c) => c.type === 'BODY')?.text || ''}
                </p>
                <p className="text-[10px] text-slate-400">
                  {previewTemplate.components?.find((c) => c.type === 'FOOTER')?.text || ''}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
