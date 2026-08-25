import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { 
  Users, 
  Target, 
  Bot, 
  FileCheck2, 
  MessageCircle, 
  ArrowUpRight, 
  Plus, 
  QrCode, 
  Megaphone,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Smartphone,
  RefreshCw,
  Instagram,
  CheckCircle2,
  Zap,
  Layers,
  Send
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMetaEmbeddedSignup } from '../hooks/useMetaEmbeddedSignup';
import { Facebook, Sparkles, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const { dashboardData } = useOutletContext();
  const queryClient = useQueryClient();

  const greeting = dashboardData?.greeting || {
    userName: 'Admin',
    subtext: 'Turn customer engagement into real business growth.'
  };

  const stats = dashboardData?.topStats || {
    totalCustomers: 0,
    leads: 0,
    activeChatbots: 0,
    formResponses: 0,
    whatsappTemplates: 0
  };

  const account = dashboardData?.accountProfile || {
    status: 'DISCONNECTED',
    name: 'WhatsApp Account',
    industry: 'TECHNOLOGY',
    displayPhoneNumber: 'Not Connected',
    wabaId: 'N/A',
    coexistenceStatus: 'NOT_APPLICABLE'
  };

  const wallet = dashboardData?.wallet || {
    balance: 0,
    usedCredits: 0
  };

  const plan = dashboardData?.plan || {
    name: 'Starter Trial',
    billingInterval: 'MONTHLY',
    expiresOn: 'Active',
    messagesUsed: 0,
    monthlyLimit: 5000
  };

  const messagesAnalysis = dashboardData?.messagesAnalysis || {
    totalMessages: 0,
    breakdown: [
      { name: 'Utility', count: 0, percentage: 0, color: '#10b981' },
      { name: 'Service', count: 0, percentage: 0, color: '#3b82f6' },
      { name: 'Marketing', count: 0, percentage: 0, color: '#8b5cf6' },
      { name: 'Authentication', count: 0, percentage: 0, color: '#f59e0b' }
    ]
  };

  const isWhatsAppConnected = account.status === 'CONNECTED' && Boolean(account.displayPhoneNumber);
  const isCoexistenceActive = account.coexistenceStatus === 'ENABLED' || account.coexistenceStatus === 'ACTIVE';

  // Meta Business Overview Query
  const { data: metaBusinessRes } = useQuery({
    queryKey: ['meta-business-overview'],
    queryFn: () => api.get('/meta-ads/business')
  });
  const metaBusiness = metaBusinessRes?.data || { isConnected: false, pages: [], adAccountId: '' };
  const isFacebookConnected = Boolean(metaBusiness.isConnected && metaBusiness.pages?.length > 0);
  const isAdAccountConnected = Boolean(metaBusiness.adAccountId);

  // 1. Meta Embedded Signup Hook
  const { launchEmbeddedSignup, isConnecting } = useMetaEmbeddedSignup({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      alert('🎉 WhatsApp Business App connected with Cloud API Coexistence successfully!');
    },
    onError: (err) => alert(`Notice: ${err.message}`)
  });

  // 2. Sync from Meta Mutation
  const syncMutation = useMutation({
    mutationFn: () => api.post('/whatsapp/sync'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert(`Meta Sync Successful! ${res.data?.syncedPhones || 1} phone number and ${res.data?.syncedTemplates || 0} templates synced.`);
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-16">
      {/* 1. Header Greeting */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Welcome back, {greeting.userName} <span className="animate-pulse">👋</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">{greeting.subtext}</p>
        </div>

        {/* Plan Pill */}
        <div className="flex items-center space-x-2">
          <span className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-black shadow-xs">
            Plan: {plan.name}
          </span>
        </div>
      </div>

      {/* 2. META CONNECTION STATUS BAR (Section 3 & 24) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">Meta Ecosystem Connection Status</h2>
          </div>
          <div className="flex items-center space-x-3 flex-wrap gap-y-1 pt-1 text-xs">
            {/* WhatsApp Status */}
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${isWhatsAppConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
              <span className="font-bold text-slate-700">WhatsApp:</span>
              <span className={`font-semibold ${isWhatsAppConnected ? 'text-emerald-700' : 'text-slate-400'}`}>
                {isWhatsAppConnected ? account.displayPhoneNumber || 'Connected' : 'Not Connected'}
              </span>
            </div>

            <span className="text-slate-300">|</span>

            {/* Facebook Page Status */}
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${isFacebookConnected ? 'bg-blue-500 animate-pulse' : 'bg-rose-400'}`} />
              <span className="font-bold text-slate-700">Facebook:</span>
              <span className={`font-semibold ${isFacebookConnected ? metaBusiness.pages?.[0]?.name || 'Connected' : 'Not Connected'}`}>
                {isFacebookConnected ? metaBusiness.pages?.[0]?.name || 'Connected' : 'Not Connected'}
              </span>
            </div>

            <span className="text-slate-300">|</span>

            {/* Instagram Status */}
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${isFacebookConnected ? 'bg-purple-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="font-bold text-slate-700">Instagram:</span>
              <span className={`font-semibold ${isFacebookConnected ? 'Linked to Page' : 'Not Connected'}`}>
                {isFacebookConnected ? 'Linked to Page' : 'Not Connected'}
              </span>
            </div>

            <span className="text-slate-300">|</span>

            {/* Ad Account Status */}
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${isAdAccountConnected ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="font-bold text-slate-700">Ad Account:</span>
              <span className={`font-semibold ${isAdAccountConnected ? 'Active' : 'Not Connected'}`}>
                {isAdAccountConnected ? 'Active' : 'Not Connected'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {!isWhatsAppConnected && (
            <Link
              to="/integrations"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Connect WhatsApp</span>
            </Link>
          )}

          {!isFacebookConnected && (
            <Link
              to="/leads"
              className="px-3 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>Connect Facebook</span>
            </Link>
          )}

          <Link
            to="/leads"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
          >
            <span>Manage Meta Ads CRM →</span>
          </Link>
        </div>
      </div>

      {/* 2. Top 5 Real-Time Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Customers */}
        <Link to="/contacts" className="bg-blue-50/60 hover:bg-blue-50 border border-blue-100 rounded-2xl p-4 transition-all group shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.totalCustomers.toLocaleString()}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Total Customers</p>
          </div>
        </Link>

        {/* Leads */}
        <Link to="/leads" className="bg-purple-50/60 hover:bg-purple-50 border border-purple-100 rounded-2xl p-4 transition-all group shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.leads}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">CRM Leads</p>
          </div>
        </Link>

        {/* Active Chatbot */}
        <Link to="/automation" className="bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 rounded-2xl p-4 transition-all group shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.activeChatbots}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Active Chatbots</p>
          </div>
        </Link>

        {/* Form Responses */}
        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.formResponses}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Form Responses</p>
          </div>
        </div>

        {/* WhatsApp Templates */}
        <Link to="/templates" className="bg-sky-50/60 hover:bg-sky-50 border border-sky-100 rounded-2xl p-4 transition-all group shadow-xs flex items-center space-x-3.5 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.whatsappTemplates}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">WhatsApp Templates</p>
          </div>
        </Link>
      </div>

      {/* 3. Middle Section: Live Account Profile, Quick Actions, Wallet, Subscription */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Real Live Account Profile Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Account Profile</span>
            <Link to="/settings" className="text-[11px] font-semibold text-emerald-600 hover:underline">
              Settings
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Status:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isWhatsAppConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {account.status}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Business:</span> <span className="font-bold text-slate-800">{account.name}</span>
            </div>
            <div>
              <span className="text-slate-400">Number:</span> <span className="font-mono text-emerald-800 font-bold">{account.displayPhoneNumber}</span>
            </div>
            <div>
              <span className="text-slate-400">WABA:</span> <span className="font-mono text-slate-600 text-[11px]">{account.wabaId}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Coexistence:</span>
            <span className="font-bold text-emerald-700">{isCoexistenceActive ? 'Active (📱+☁️)' : 'Standard'}</span>
          </div>
        </div>

        {/* Quick Actions (Real Action Links) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-700">Quick Actions</span>
          <div className="space-y-2 my-2">
            <Link
              to="/contacts"
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Import / Add Customers</span>
            </Link>

            <Link
              to="/templates"
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
            >
              <MessageCircle className="w-3.5 h-3.5 text-sky-600" />
              <span>Create Meta Template</span>
            </Link>

            <Link
              to="/automation"
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              <span>Create Chatbot Rule</span>
            </Link>

            <Link
              to="/campaigns"
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-xs font-bold text-emerald-800 transition"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>Launch Broadcast</span>
            </Link>
          </div>
        </div>

        {/* Live Wallet Balance */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Prepaid Wallet</span>
            <Link
              to="/billing"
              className="px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold transition"
            >
              Add Credits
            </Link>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900">₹ {Number(wallet.balance).toFixed(2)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Used Credits: ₹{Number(wallet.usedCredits).toFixed(2)}</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400">Rate: ₹0.40 / msg</span>
            <Link to="/billing" className="text-[11px] font-semibold text-emerald-600 hover:underline">
              Ledger
            </Link>
          </div>
        </div>

        {/* Active Subscription Tier */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-800">{plan.name}</span>
            <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
              {plan.billingInterval}
            </span>
          </div>
          <div className="my-2 text-xs text-slate-500">
            <span>Billing Period:</span>
            <p className="font-semibold text-slate-700 mt-0.5">{plan.expiresOn}</p>
          </div>
          <Link
            to="/billing"
            className="w-full text-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>

      {/* 4. Bottom Row: Real Messages Analysis Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Messages Analysis Donut Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Messages Analysis & Deliverability</h3>
              <p className="text-xs text-slate-400">Category breakdown of all dispatched WhatsApp messages this month.</p>
            </div>
            <Link to="/analytics" className="text-[11px] font-semibold text-emerald-600 hover:underline">
              View Analytics
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
            <div className="relative h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={messagesAnalysis.breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {messagesAnalysis.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Total Messages</span>
                <span className="text-lg font-black text-slate-800">{messagesAnalysis.totalMessages.toLocaleString()}</span>
              </div>
            </div>

            {/* Breakdown Legend */}
            <div className="space-y-2 text-xs">
              {messagesAnalysis.breakdown.map((b) => (
                <div key={b.name} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="font-semibold text-slate-700">{b.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{b.count.toLocaleString()} ({b.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coexistence & Multi-Channel Guide Tile */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold">Meta Multi-Channel Hub</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your WhatsApp Business App and Instagram account to manage conversations, broadcasts, and AI chatbots in one unified team inbox.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>WhatsApp Coexistence:</span>
              <span className="text-emerald-400 font-bold">{isWhatsAppConnected ? 'Active' : 'Ready'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Instagram Messaging:</span>
              <span className="text-purple-400 font-bold">Supported</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
