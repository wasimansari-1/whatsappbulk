import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useMetaEmbeddedSignup } from '../hooks/useMetaEmbeddedSignup';
import { useAuthStore } from '../stores/authStore';
import ManualWhatsAppModal from '../components/ManualWhatsAppModal';
import ManualFacebookModal from '../components/ManualFacebookModal';
import {
  Zap,
  CheckCircle2,
  Copy,
  Key,
  Code,
  Globe,
  Sliders,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  CreditCard,
  FileSpreadsheet,
  Webhook,
  Terminal,
  Plus,
  X,
  Check,
  Smartphone,
  Facebook,
  Instagram,
  Target,
  RefreshCw,
  Lock,
  Wrench,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user, activeOrganization } = useAuthStore();

  const [activeLang, setActiveLang] = useState('curl'); // 'curl', 'node', 'python'
  const [isGenerateKeyModalOpen, setIsGenerateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isManualWhatsAppModalOpen, setIsManualWhatsAppModalOpen] = useState(false);
  const [isManualFacebookModalOpen, setIsManualFacebookModalOpen] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState(null);

  // 1. Fetch WhatsApp Business Profile
  const { data: whatsappProfileRes } = useQuery({
    queryKey: ['whatsapp-profile'],
    queryFn: () => api.get('/whatsapp/profile')
  });
  const whatsappProfile = whatsappProfileRes?.data?.profile || { status: 'DISCONNECTED' };
  const isWhatsAppConnected = whatsappProfile.status === 'CONNECTED';

  // Test WhatsApp Connection Mutation
  const testWhatsAppMutation = useMutation({
    mutationFn: () => api.post('/whatsapp/test-connection'),
    onSuccess: (res) => {
      const data = res.data || res;
      setTestConnectionResult(data);
      if (data.isConnected) {
        toast.success(
          `Connection 100% verified! WABA: ${data.details?.wabaName}, Quality: ${data.details?.qualityRating}`,
          'Meta Cloud API Verified 🟢'
        );
      } else {
        toast.error(data.errors?.[0] || 'Meta API verification check failed.', 'Connection Test Warning');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message, 'Connection Test Failed');
    }
  });

  // 2. Fetch Meta Ads / Facebook Page Overview for active Organization
  const { data: metaBusinessRes } = useQuery({
    queryKey: ['meta-business-overview'],
    queryFn: () => api.get('/meta-ads/business').catch(() => ({ data: { isConnected: false, pages: [], adAccountId: '' } }))
  });
  const metaBusiness = metaBusinessRes?.data || { isConnected: false, pages: [], adAccountId: '' };
  const isFacebookConnected = Boolean(metaBusiness.isConnected && metaBusiness.pages?.length > 0);
  const isAdAccountConnected = Boolean(metaBusiness.adAccountId);

  // 3. Fetch Integrations
  const { data: integrationsRes } = useQuery({
    queryKey: ['integrations-list'],
    queryFn: () => api.get('/integrations')
  });
  const integrations = integrationsRes?.data || [];

  // 4. Fetch API Keys
  const { data: apiKeysRes } = useQuery({
    queryKey: ['api-keys-list'],
    queryFn: () => api.get('/integrations/api-keys')
  });
  const apiKeys = apiKeysRes?.data || [];
  const activeKey = apiKeys[0]?.key || 'wapp_live_sample_key_98129038102938';

  // Meta Embedded Signup Hook
  const { launchEmbeddedSignup, isConnecting } = useMetaEmbeddedSignup({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      toast.success('WhatsApp Business Account connected successfully!', 'WhatsApp Active');
    },
    onError: (err) => toast.error(err.message, 'Connection Error')
  });

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: (type) => api.patch(`/integrations/${type}/toggle`),
    onSuccess: (res, type) => {
      queryClient.invalidateQueries({ queryKey: ['integrations-list'] });
      toast.success(`${type} integration status updated.`, 'Status Changed');
    }
  });

  const generateKeyMutation = useMutation({
    mutationFn: (name) => api.post('/integrations/api-keys', { name }),
    onSuccess: () => {
      setIsGenerateKeyModalOpen(false);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys-list'] });
      toast.success('New Developer API Key generated!', 'Key Created');
    }
  });

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`, 'Copied');
  };

  // Code Snippets
  const codeSnippets = {
    curl: `curl -X POST https://api.wappbiz.io/v1/messages/send \\
  -H "Authorization: Bearer ${activeKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "type": "template",
    "templateName": "order_confirmation_v1",
    "language": "en",
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Rahul Sharma" },
          { "type": "text", "text": "#ORD-8921" }
        ]
      }
    ]
  }'`,
    node: `const axios = require('axios');

async function sendWhatsAppMessage() {
  const response = await axios.post('https://api.wappbiz.io/v1/messages/send', {
    to: '+919876543210',
    type: 'template',
    templateName: 'order_confirmation_v1',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Rahul Sharma' },
          { type: 'text', text: '#ORD-8921' }
        ]
      }
    ]
  }, {
    headers: {
      'Authorization': 'Bearer ${activeKey}',
      'Content-Type': 'application/json'
    }
  });

  console.log('Message sent:', response.data);
}

sendWhatsAppMessage();`,
    python: `import requests

url = "https://api.wappbiz.io/v1/messages/send"
headers = {
    "Authorization": "Bearer ${activeKey}",
    "Content-Type": "application/json"
}
payload = {
    "to": "+919876543210",
    "type": "template",
    "templateName": "order_confirmation_v1",
    "language": "en",
    "components": [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": "Rahul Sharma"},
                {"type": "text", "text": "#ORD-8921"}
            ]
        }
    ]
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`
  };

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-8 pb-24">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Zap className="w-6 h-6 text-emerald-600" />
            <span>Meta Connection Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect your Meta Business assets to manage WhatsApp, Facebook Pages, Instagram and Meta Ads from one place.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateKeyModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5"
        >
          <Key className="w-3.5 h-3.5" />
          <span>Generate API Key</span>
        </button>
      </div>

      {/* 2. META CONNECTION CENTER CARDS (Sections 8 & 9) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">Meta Business Assets</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: WHATSAPP BUSINESS */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black ${isWhatsAppConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  <span>{isWhatsAppConnected ? '🟢 Connected' : '🔴 Not Connected'}</span>
                </span>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">WHATSAPP BUSINESS</h3>
                {isWhatsAppConnected ? (
                  <div className="text-[11px] text-slate-600 mt-2 space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p><strong className="text-slate-900">Business:</strong> {whatsappProfile.businessName || 'WhatsApp Business'}</p>
                    <p><strong className="text-slate-900">Phone:</strong> <span className="font-mono text-emerald-700 font-bold">{whatsappProfile.displayPhoneNumber}</span></p>
                    <p><strong className="text-slate-900">WABA ID:</strong> <span className="font-mono">{whatsappProfile.wabaId ? `***${whatsappProfile.wabaId.slice(-6)}` : 'Verified'}</span></p>
                    <div className="pt-1 flex items-center space-x-1 text-[10px] text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Meta Cloud API Verified</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Connect your WhatsApp Business account to send broadcast campaigns and manage chats.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              {isWhatsAppConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => testWhatsAppMutation.mutate()}
                      disabled={testWhatsAppMutation.isPending}
                      className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testWhatsAppMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>{testWhatsAppMutation.isPending ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                    <button
                      onClick={() => setIsManualWhatsAppModalOpen(true)}
                      className="font-bold text-slate-600 hover:text-slate-900"
                    >
                      Edit Config
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Disconnect WhatsApp Business connection?')) {
                          api.post('/whatsapp/disconnect').then(() => {
                            queryClient.invalidateQueries({ queryKey: ['whatsapp-profile'] });
                            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
                            toast.success('WhatsApp disconnected.', 'Status');
                          });
                        }
                      }}
                      className="font-bold text-rose-600 hover:underline"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Connect Manually - Primary Flow */}
                  <button
                    onClick={() => setIsManualWhatsAppModalOpen(true)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Connect Manually</span>
                  </button>

                  {/* Connect Automatically - Coming Soon */}
                  <div className="text-center">
                    <button
                      disabled
                      className="w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-[11px] font-bold cursor-not-allowed flex items-center justify-center space-x-1"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Connect Automatically (Coming Soon)</span>
                    </button>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Automatic Meta Partner connection is coming soon.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: FACEBOOK PAGES */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-[#1877F2]">
                  <Facebook className="w-5 h-5" />
                </div>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                  isFacebookConnected ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  <span>{isFacebookConnected ? '🟢 Connected' : '🔴 Not Connected'}</span>
                </span>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">FACEBOOK PAGES & LEADS</h3>
                {isFacebookConnected ? (
                  <div className="text-[11px] text-slate-600 mt-2 space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p><strong className="text-slate-900">Page:</strong> {metaBusiness.pages?.[0]?.name || 'Connected Page'}</p>
                    <p><strong className="text-slate-900">Page ID:</strong> <span className="font-mono">{metaBusiness.pages?.[0]?.id || 'Active'}</span></p>
                    <p><strong className="text-slate-900">Webhooks:</strong> <span className="text-emerald-700 font-bold">🟢 Active (leadgen)</span></p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Connect Facebook Pages to receive Lead Ads directly into your CRM via webhooks.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              {isFacebookConnected ? (
                <div className="flex items-center justify-between text-xs">
                  <Link to="/leads" className="font-bold text-blue-600 hover:underline">
                    Manage Pages →
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Disconnect Facebook Page?')) {
                        api.post('/meta-ads/disconnect-page', { pageId: metaBusiness.pages?.[0]?.id }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['meta-business-overview'] });
                          toast.success('Facebook Page disconnected.', 'Status');
                        });
                      }
                    }}
                    className="font-bold text-rose-600 hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setIsManualFacebookModalOpen(true)}
                    className="w-full py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Connect Manually</span>
                  </button>
                  <button
                    disabled
                    className="w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-[11px] font-bold cursor-not-allowed flex items-center justify-center space-x-1"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Connect Automatically (Coming Soon)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: META ADS */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                  <Target className="w-5 h-5" />
                </div>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                  isAdAccountConnected ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  <span>{isAdAccountConnected ? '🟢 Connected' : '🔴 Not Connected'}</span>
                </span>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">META ADS</h3>
                {isAdAccountConnected ? (
                  <div className="text-[11px] text-slate-600 mt-2 space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p><strong className="text-slate-900">Ad Account ID:</strong> <span className="font-mono">{metaBusiness.adAccountId}</span></p>
                    <p><strong className="text-slate-900">Currency:</strong> INR (₹)</p>
                    <p><strong className="text-slate-900">Sync Status:</strong> <span className="text-emerald-700 font-bold">🟢 Live Marketing API</span></p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Connect your Meta Ad Account to manage campaigns, ad sets, ads, lead forms and insights.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              {isAdAccountConnected ? (
                <Link to="/leads" className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition block text-center">
                  Open Campaigns CRM →
                </Link>
              ) : (
                <Link
                  to="/leads"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition block text-center"
                >
                  Connect Ad Account
                </Link>
              )}
            </div>
          </div>

          {/* Card 4: INSTAGRAM */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition opacity-80">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600">
                  <Instagram className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                  <span>⏳ Coming Soon</span>
                </span>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">INSTAGRAM</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Instagram Direct Messaging automation requires Meta Advanced Tech Provider Access. Coming soon.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button disabled className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" />
                <span>Instagram — Coming Soon</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. POPULAR 1-CLICK CONNECTORS (Shopify, Razorpay, Google Sheets, Webhook) */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">E-Commerce, Payments & CRM Connectors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              type: 'SHOPIFY',
              title: 'Shopify Store',
              desc: 'Automated order confirmations, shipping updates, and abandoned cart recovery.',
              icon: ShoppingBag,
              color: 'text-emerald-600 bg-emerald-50'
            },
            {
              type: 'RAZORPAY',
              title: 'Razorpay & UPI',
              desc: 'Generate instant payment links and send automated invoice receipts.',
              icon: CreditCard,
              color: 'text-blue-600 bg-blue-50'
            },
            {
              type: 'GOOGLE_SHEETS',
              title: 'Google Sheets',
              desc: 'Auto-export new WhatsApp leads and broadcast triggers from live spreadsheets.',
              icon: FileSpreadsheet,
              color: 'text-green-600 bg-green-50'
            },
            {
              type: 'WEBHOOK',
              title: 'Custom Webhook',
              desc: 'Real-time JSON event dispatcher for incoming WhatsApp messages and leads.',
              icon: Webhook,
              color: 'text-purple-600 bg-purple-50'
            }
          ].map((c) => {
            const Icon = c.icon;
            const currentInt = integrations.find((i) => i.type === c.type);
            const isConnected = currentInt?.status === 'CONNECTED';

            return (
              <div key={c.type} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-2xl ${c.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => toggleMutation.mutate(c.type)}
                      className="focus:outline-hidden"
                    >
                      {isConnected ? (
                        <span className="w-9 h-5 bg-emerald-500 rounded-full flex items-center p-0.5 transition justify-end shadow-xs">
                          <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                        </span>
                      ) : (
                        <span className="w-9 h-5 bg-slate-300 rounded-full flex items-center p-0.5 transition justify-start shadow-xs">
                          <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                        </span>
                      )}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-900">{c.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{c.desc}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                  <span className={isConnected ? 'text-emerald-700' : 'text-slate-400'}>
                    {isConnected ? '● Connected & Active' : '○ Paused / Inactive'}
                  </span>
                  <button
                    onClick={() => toast.info(`Configuring ${c.title} settings...`, 'Settings')}
                    className="text-slate-600 hover:text-emerald-600 transition"
                  >
                    Configure →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. DEVELOPER REST API & LIVE CODE SAMPLES */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span>Developer REST API Quickstart</span>
            </h3>
            <p className="text-xs text-slate-500">Send WhatsApp templates and messages from your own backend application.</p>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            {['curl', 'node', 'python'].map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`px-3 py-1 rounded-lg uppercase tracking-wider transition ${
                  activeLang === lang ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                {lang === 'node' ? 'Node.js' : lang}
              </button>
            ))}
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative group">
          <pre className="p-5 bg-slate-950 text-emerald-400 rounded-2xl overflow-x-auto text-xs font-mono leading-relaxed max-h-96">
            {codeSnippets[activeLang]}
          </pre>
          <button
            onClick={() => copyToClipboard(codeSnippets[activeLang], 'Code Snippet')}
            className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition text-xs font-bold flex items-center space-x-1 shadow-md opacity-80 group-hover:opacity-100"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Code</span>
          </button>
        </div>

        {/* Active API Keys List */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Active API Keys</h4>
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div key={k._id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-slate-900">{k.name}</p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">{k.key}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(k.key, 'API Key')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs shrink-0 ml-3"
                >
                  <Copy className="w-3 h-3 text-emerald-600" />
                  <span>Copy</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. GENERATE API KEY MODAL */}
      {isGenerateKeyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Generate New API Key</h3>
              </div>
              <button onClick={() => setIsGenerateKeyModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Key Name / Description</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Backend Production Server"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900">
                This API key provides full access to dispatch WhatsApp messages and query conversation webhooks.
              </div>

              <button
                onClick={() => {
                  if (!newKeyName.trim()) {
                    toast.error('Key name is required.', 'Missing Fields');
                    return;
                  }
                  generateKeyMutation.mutate(newKeyName.trim());
                }}
                disabled={generateKeyMutation.isPending}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 transition"
              >
                {generateKeyMutation.isPending ? 'Generating...' : 'Generate Secret Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MANUAL WHATSAPP CONNECTION MODAL */}
      <ManualWhatsAppModal
        isOpen={isManualWhatsAppModalOpen}
        onClose={() => setIsManualWhatsAppModalOpen(false)}
        initialData={
          isWhatsAppConnected
            ? {
                wabaId: whatsappProfile.wabaId,
                phoneNumberId: whatsappProfile.phoneNumberId,
                displayPhoneNumber: whatsappProfile.displayPhoneNumber
              }
            : null
        }
      />

      {/* 6. MANUAL FACEBOOK PAGE MODAL */}
      <ManualFacebookModal
        isOpen={isManualFacebookModalOpen}
        onClose={() => setIsManualFacebookModalOpen(false)}
      />
    </div>
  );
}
