import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useMetaEmbeddedSignup } from '../hooks/useMetaEmbeddedSignup';
import ManualWhatsAppModal from '../components/ManualWhatsAppModal';
import {
  Smartphone,
  Users,
  Key,
  Webhook,
  Shield,
  CheckCircle2,
  Copy,
  Plus,
  RefreshCw,
  Zap,
  Save,
  Unlink,
  Check,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Lock
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Fetch Business Profile & Connection Status
  const { data: profileRes, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/whatsapp/profile')
  });

  const profileData = profileRes?.data || null;
  const isConnected = profileData?.profile?.status === 'CONNECTED';
  const isCoexistenceActive = profileData?.profile?.coexistenceStatus === 'ACTIVE' || profileData?.profile?.coexistenceStatus === 'ENABLED';

  // 1. Meta Embedded Signup / Direct OAuth Hook (Feature Flagged)
  const { launchEmbeddedSignup, isConnecting, metaConfig } = useMetaEmbeddedSignup({
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('WhatsApp Business connected successfully!', 'Connected');
    },
    onError: (err) => {
      toast.error(err.message, 'Connection Error');
    }
  });

  // Test Connection Mutation
  const testWhatsAppMutation = useMutation({
    mutationFn: () => api.post('/whatsapp/test-connection'),
    onSuccess: (res) => {
      const data = res.data || res;
      if (data.isConnected) {
        toast.success(`Meta Graph API Verified! WABA: ${data.details?.wabaName}, Quality: ${data.details?.qualityRating}`, 'Test Passed 🟢');
      } else {
        toast.error(data.errors?.[0] || 'Meta API verification check failed.', 'Test Notice');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message, 'Test Failed');
    }
  });

  // 2. Sync from Meta Mutation
  const syncMutation = useMutation({
    mutationFn: () => api.post('/whatsapp/sync'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      alert(`Meta Sync Successful! ${res.data?.syncedPhones || 1} phone number and ${res.data?.syncedTemplates || 0} templates synced from Meta.`);
    },
    onError: (err) => {
      alert(`Meta Sync failed: ${err.message}`);
    }
  });

  // 3. Disconnect Mutation
  const disconnectMutation = useMutation({
    mutationFn: () => api.post('/whatsapp/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      alert('WhatsApp connection disconnected cleanly.');
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Organization Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage Meta WhatsApp Cloud API connection, Coexistence status, team members, and webhooks.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        {[
          { id: 'whatsapp', label: 'WhatsApp & Coexistence', icon: Smartphone },
          { id: 'team', label: 'Team & RBAC', icon: Users },
          { id: 'apikeys', label: 'API Keys', icon: Key },
          { id: 'webhooks', label: 'Webhooks & Compliance', icon: Webhook }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: WHATSAPP EMBEDDED SIGNUP & COEXISTENCE */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {/* Main Connection Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-base font-extrabold text-slate-900">WhatsApp Business Platform Connection</h3>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                      isConnected
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {isConnected ? 'LIVE CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Official Meta Cloud API integration with seamless WhatsApp Business App coexistence.
                </p>
              </div>

              {/* Action Buttons: Connect / Reconnect / Sync / Test */}
              <div className="flex flex-wrap items-center gap-2">
                {isConnected && (
                  <>
                    <button
                      onClick={() => testWhatsAppMutation.mutate()}
                      disabled={testWhatsAppMutation.isPending}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 transition"
                      title="Run live Meta Graph API verification check"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testWhatsAppMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>{testWhatsAppMutation.isPending ? 'Testing...' : 'Test Connection'}</span>
                    </button>

                    <button
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
                      title="Sync profile from Meta"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>{syncMutation.isPending ? 'Syncing...' : 'Sync Meta'}</span>
                    </button>
                  </>
                )}

                {/* Primary Connect Manually Button */}
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/25 transition"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isConnected ? 'Edit Manual Config' : 'Connect Manually'}</span>
                </button>
              </div>
            </div>

            {/* COEXISTENCE STATUS BANNER */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-blue-50/50 border border-emerald-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-600/30">
                    📱+☁️
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-emerald-950">WhatsApp Business App Coexistence</h4>
                      <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Your number is active on both your physical phone's WhatsApp Business App and this Cloud SaaS simultaneously.
                    </p>
                  </div>
                </div>

                {isConnected && (
                  <button
                    onClick={() => {
                      if (confirm('Disconnect WhatsApp connection? (Your mobile WhatsApp Business App will continue to work normally)')) {
                        disconnectMutation.mutate();
                      }
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>

              {/* Grid of Verified Connection Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-200/60 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Business Name</span>
                  <p className="font-bold text-slate-800 mt-0.5">{profileData?.profile?.businessName || (isConnected ? 'WhatsApp Business' : 'Not Connected')}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Connected Number</span>
                  <p className="font-mono text-emerald-800 font-bold mt-0.5">{profileData?.profile?.displayPhoneNumber || 'Not Connected'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">WABA ID</span>
                  <p className="font-mono text-slate-700 font-semibold mt-0.5">{profileData?.profile?.wabaId || 'Not Connected'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Phone Number ID</span>
                  <p className="font-mono text-slate-700 font-semibold mt-0.5">{profileData?.profile?.phoneNumberId || 'Not Connected'}</p>
                </div>
              </div>
            </div>

            {/* Key Advantages / Coexistence Info Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No Phone De-registration</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  You do NOT need to delete or migrate away from your mobile WhatsApp Business App.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>2-Way Live Sync</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Messages and conversations stay synchronized in real time between your mobile app and SaaS inbox.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>High-Speed Campaigns</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Broadcasts are dispatched via official Meta Cloud API with carrier-level deliverability.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Organization Members & RBAC Roles</h3>
            <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
              Invite Member
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">Wasim Ansari</p>
                <p className="text-slate-400">wasim@arvee.com</p>
              </div>
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-bold text-[10px]">OWNER</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: API KEYS */}
      {activeTab === 'apikeys' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Developer API Keys</h3>
            <button onClick={() => alert('Generated API Key: wapp_live_89a0b1c2d3e4f5')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
              Create New Key
            </button>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
            <span className="font-mono text-slate-800 font-bold">wapp_live_1049968644261349****************</span>
            <button onClick={() => alert('API Key Copied')} className="p-1 hover:bg-slate-200 rounded text-slate-600">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: WEBHOOKS & COMPLIANCE */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Meta Webhook Ingestion Configuration</h3>
            <p className="text-xs text-slate-500">Configure these exact values in your Meta App Dashboard (WhatsApp &gt; Configuration):</p>

            <div className="space-y-3 pt-2 text-xs font-mono">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Callback URL</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-800 font-bold">https://minimal-departmental-deliver-freedom.trycloudflare.com/api/v1/webhooks/whatsapp</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://minimal-departmental-deliver-freedom.trycloudflare.com/api/v1/webhooks/whatsapp');
                      alert('Callback URL Copied!');
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Verify Token</span>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 font-bold">whatsapp_bulk_saas_verify_token_2026</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('whatsapp_bulk_saas_verify_token_2026');
                      alert('Verify Token Copied!');
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Meta App Review Compliance Endpoints */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Meta App Review Compliance Endpoints</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-semibold">Data Deletion Callback:</span>
                <span className="font-mono text-slate-800">https://minimal-departmental-deliver-freedom.trycloudflare.com/api/v1/compliance/data-deletion</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-semibold">Privacy Policy:</span>
                <span className="font-mono text-slate-800">https://minimal-departmental-deliver-freedom.trycloudflare.com/api/v1/compliance/privacy-policy</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-semibold">Terms of Service:</span>
                <span className="font-mono text-slate-800">https://minimal-departmental-deliver-freedom.trycloudflare.com/api/v1/compliance/terms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual WhatsApp Connection Wizard Modal */}
      <ManualWhatsAppModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        initialData={
          isConnected
            ? {
                wabaId: profileData?.profile?.wabaId,
                phoneNumberId: profileData?.profile?.phoneNumberId,
                displayPhoneNumber: profileData?.profile?.displayPhoneNumber
              }
            : null
        }
      />
    </div>
  );
}
