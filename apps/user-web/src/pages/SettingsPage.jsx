import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
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
  Save
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('whatsapp');

  const { data: profileRes, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/whatsapp/profile')
  });

  const profileData = profileRes?.data || null;

  // Form state for Meta Configuration
  const [metaForm, setMetaForm] = useState({
    wabaId: '1049968644261349',
    phoneNumberId: '1223600624165995',
    displayPhoneNumber: '+91 91998 00309',
    verifiedName: 'IGlobal Tech',
    accessToken: ''
  });

  // Sync with Meta Mutation
  const syncMutation = useMutation({
    mutationFn: () => api.post('/whatsapp/sync'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      alert(`Meta Sync Successful! ${res.data?.syncedPhones || 1} phone number and ${res.data?.syncedTemplates || 0} templates synced from Meta Cloud API.`);
    },
    onError: (err) => {
      alert(`Meta Sync failed: ${err.message}`);
    }
  });

  // Save Meta Configuration Mutation
  const saveMetaMutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/connect', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      alert('Meta WhatsApp Account configuration saved successfully!');
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Organization Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage Meta WhatsApp Cloud API connection, team members, and webhooks.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        {[
          { id: 'whatsapp', label: 'Meta WhatsApp Connect', icon: Smartphone },
          { id: 'team', label: 'Team & RBAC', icon: Users },
          { id: 'apikeys', label: 'API Keys', icon: Key },
          { id: 'webhooks', label: 'Webhooks', icon: Webhook }
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

      {/* Tab 1: Meta WhatsApp Connection & Number Settings */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {/* Status Card with Live Sync Button */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">Official Meta WhatsApp Cloud API Status</h3>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                    LIVE CONNECTED
                  </span>
                </div>
                <p className="text-xs text-slate-500">Connected to Meta Graph API v20.0 with automatic template & messaging sync.</p>
              </div>

              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                <span>{syncMutation.isPending ? 'Syncing with Meta...' : 'Sync from Meta'}</span>
              </button>
            </div>

            {/* Live Number Details Card */}
            <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{profileData?.profile?.businessName || 'IGlobal Tech'}</p>
                  <p className="text-xs font-mono text-emerald-800 font-semibold mt-0.5">{profileData?.profile?.displayPhoneNumber || '+91 91998 00309'}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400 text-[10px]">Quality Rating</span>
                  <p className="font-bold text-emerald-600">GREEN</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-emerald-200/60 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">WABA ID:</span>
                  <p className="font-mono text-slate-700 font-semibold">{profileData?.profile?.wabaId || '1049968644261349'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Phone Number ID:</span>
                  <p className="font-mono text-slate-700 font-semibold">{profileData?.profile?.phoneNumberId || '1223600624165995'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Messaging Limit:</span>
                  <p className="font-bold text-slate-700">10,000 / 24 hrs</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Cloud API Version:</span>
                  <p className="font-bold text-emerald-700">v20.0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Connect / Update WhatsApp Credentials Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Update Meta Credentials & Phone Number</h3>
            <p className="text-xs text-slate-500">Configure or change your official Meta WhatsApp Business account credentials:</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMetaMutation.mutate(metaForm);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Business Account ID (WABA ID)</label>
                  <input
                    type="text"
                    required
                    value={metaForm.wabaId}
                    onChange={(e) => setMetaForm({ ...metaForm, wabaId: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-mono"
                    placeholder="1049968644261349"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    required
                    value={metaForm.phoneNumberId}
                    onChange={(e) => setMetaForm({ ...metaForm, phoneNumberId: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-mono"
                    placeholder="1223600624165995"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Display Phone Number (with country code)</label>
                  <input
                    type="text"
                    required
                    value={metaForm.displayPhoneNumber}
                    onChange={(e) => setMetaForm({ ...metaForm, displayPhoneNumber: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                    placeholder="+91 91998 00309"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Verified Business Name</label>
                  <input
                    type="text"
                    required
                    value={metaForm.verifiedName}
                    onChange={(e) => setMetaForm({ ...metaForm, verifiedName: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                    placeholder="IGlobal Tech"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saveMetaMutation.isPending}
                  className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveMetaMutation.isPending ? 'Saving...' : 'Save Meta Configuration'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Team */}
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

      {/* Tab 3: API Keys */}
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

      {/* Tab 4: Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Meta Webhook Ingestion Configuration</h3>
          <p className="text-xs text-slate-500">Configure these exact values in your Meta App Dashboard (**WhatsApp > Configuration**):</p>
          
          <div className="space-y-3 pt-2 text-xs font-mono">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Callback URL</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-bold">https://minimal-departmental-deliver-freedom.trycloudflare.com/api/v1/webhooks/whatsapp</span>
                <button onClick={() => {
                  navigator.clipboard.writeText('https://minimal-departmental-deliver-freedom.trycloudflare.com/api/v1/webhooks/whatsapp');
                  alert('Callback URL Copied!');
                }} className="p-1 hover:bg-slate-200 rounded text-slate-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Verify Token</span>
              <div className="flex items-center justify-between">
                <span className="text-emerald-700 font-bold">whatsapp_bulk_saas_verify_token_2026</span>
                <button onClick={() => {
                  navigator.clipboard.writeText('whatsapp_bulk_saas_verify_token_2026');
                  alert('Verify Token Copied!');
                }} className="p-1 hover:bg-slate-200 rounded text-slate-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
