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
  TrendingUp
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function DashboardPage() {
  const { dashboardData } = useOutletContext();

  const greeting = dashboardData?.greeting || {
    userName: 'Wasim',
    subtext: 'Turn customer engagement into real business growth.'
  };

  const stats = dashboardData?.topStats || {
    totalCustomers: 2223,
    leads: 0,
    activeChatbots: 3,
    formResponses: 67,
    whatsappTemplates: 23
  };

  const account = dashboardData?.accountProfile || {
    status: 'CONNECTED',
    name: 'Arvee Appliances',
    industry: 'OTHER',
    displayPhoneNumber: '+918700994288'
  };

  const wallet = dashboardData?.wallet || {
    balance: 517.65,
    usedCredits: 1481.49
  };

  const plan = dashboardData?.plan || {
    name: 'Basic',
    billingInterval: 'Quarterly',
    expiresOn: '19 Nov 26, 4:20 pm'
  };

  const messagesAnalysis = dashboardData?.messagesAnalysis || {
    totalMessages: 12814,
    breakdown: [
      { name: 'Utility', count: 10268, percentage: 80, color: '#10b981' },
      { name: 'Service', count: 2258, percentage: 18, color: '#3b82f6' },
      { name: 'Marketing', count: 288, percentage: 2, color: '#8b5cf6' },
      { name: 'Authentication', count: 0, percentage: 0, color: '#f59e0b' }
    ]
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* 1. Header Greeting */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          Good Afternoon, {greeting.userName} <span className="animate-pulse">👋</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">{greeting.subtext}</p>
      </div>

      {/* 2. Top 5 Metric Cards (Matching reference screenshot pastel cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Customers */}
        <Link to="/contacts" className="bg-blue-50/60 hover:bg-blue-50 border border-blue-100 rounded-2xl p-4 transition-all group shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.totalCustomers.toLocaleString()}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Total Customers</p>
          </div>
        </Link>

        {/* Leads */}
        <Link to="/leads" className="bg-purple-50/60 hover:bg-purple-50 border border-purple-100 rounded-2xl p-4 transition-all group shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.leads}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Leads</p>
          </div>
        </Link>

        {/* Active Chatbot */}
        <Link to="/automation" className="bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 rounded-2xl p-4 transition-all group shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.activeChatbots}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Active Chatbot</p>
          </div>
        </Link>

        {/* Form Responses */}
        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.formResponses}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Form Responses</p>
          </div>
        </div>

        {/* WhatsApp Templates */}
        <Link to="/templates" className="bg-sky-50/60 hover:bg-sky-50 border border-sky-100 rounded-2xl p-4 transition-all group shadow-sm flex items-center space-x-3.5 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.whatsappTemplates}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">WhatsApp Templates</p>
          </div>
        </Link>
      </div>

      {/* 3. Middle Section (Account Profile, Quick Actions, Wallet, Subscription) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Account Profile Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Account Profile</span>
            <Link to="/settings" className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 flex items-center">
              View Profile
            </Link>
          </div>

          <div className="flex items-center space-x-4 my-3">
            <div className="w-14 h-14 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50 p-2">
              <span className="text-xs font-black text-slate-700 tracking-tighter text-center">CHIMNEY SOLUTIONS</span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Account Status:</span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{account.status}</span>
              </div>
              <div>
                <span className="text-slate-400">Name:</span> <span className="font-semibold text-slate-800">{account.name}</span>
              </div>
              <div>
                <span className="text-slate-400">Industry:</span> <span className="text-slate-700">{account.industry}</span>
              </div>
              <div>
                <span className="text-slate-400">Number:</span> <span className="font-mono text-slate-800 font-semibold">{account.displayPhoneNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-600">Quick Actions</span>
          <div className="space-y-2 mt-2">
            <Link
              to="/contacts"
              className="w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-xs font-semibold text-slate-700 transition"
            >
              <Users className="w-4 h-4 text-brand-600" />
              <span>Import Customers</span>
            </Link>
            <button
              onClick={() => alert('WhatsApp QR code generator created!')}
              className="w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-xs font-semibold text-slate-700 transition"
            >
              <QrCode className="w-4 h-4 text-slate-600" />
              <span>Create WhatsApp Button/QR Code</span>
            </button>
            <Link
              to="/automation"
              className="w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-xs font-semibold text-slate-700 transition"
            >
              <Bot className="w-4 h-4 text-emerald-600" />
              <span>Create Chatbot</span>
            </Link>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Wallet Balance</span>
            <Link
              to="/billing"
              className="px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold transition"
            >
              Buy More
            </Link>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900">₹ {Number(wallet.balance).toFixed(2)}</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400">Used Credits</span>
              <p className="font-bold text-slate-700">₹ {Number(wallet.usedCredits).toFixed(2)}</p>
            </div>
            <Link to="/billing" className="text-[11px] font-semibold text-emerald-600 hover:underline">
              View Details
            </Link>
          </div>
        </div>

        {/* Subscription Plan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-800">{plan.name}</span>
            <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
              {plan.billingInterval}
            </span>
          </div>
          <div className="my-2 text-xs text-slate-500">
            <span>Expires on:</span>
            <p className="font-semibold text-slate-700 mt-0.5">{plan.expiresOn}</p>
          </div>
          <Link
            to="/billing"
            className="w-full text-center py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-500/20 transition"
          >
            Upgrade Now
          </Link>
        </div>
      </div>

      {/* 4. Bottom Row: Promo Cards & Messages Analysis Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Live Meta Ads Promo Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center text-center justify-between min-h-[260px]">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <Megaphone className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Live Meta Ads</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Track your Facebook & Instagram ad performance right from your dashboard.
            </p>
          </div>
          <Link
            to="/billing"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition"
          >
            Upgrade to Premium
          </Link>
        </div>

        {/* Leads Management Promo Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center text-center justify-between min-h-[260px]">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
            <Target className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Leads Management</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Leads captured from ads, forms, and integrations will show up here.
            </p>
          </div>
          <Link
            to="/leads"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition"
          >
            Create Lead
          </Link>
        </div>

        {/* Recent Orders / Catalog Promo Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center text-center justify-between min-h-[260px]">
          <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mb-2">
            <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Recent Orders</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Connect your product catalog in Integrations to start tracking orders here.
            </p>
          </div>
          <button
            onClick={() => alert('WhatsApp Product Catalog connect wizard!')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition"
          >
            Connect Catalog
          </button>
        </div>

        {/* Messages Analysis Donut Chart (Matching reference screenshot) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[260px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Messages Analysis</span>
            <Link to="/analytics" className="text-[11px] font-semibold text-emerald-600 hover:underline">
              View More
            </Link>
          </div>

          <div className="relative h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={messagesAnalysis.breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
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
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Total Messages</span>
              <span className="text-sm font-black text-slate-800">{messagesAnalysis.totalMessages.toLocaleString()}</span>
            </div>
          </div>

          {/* Chart Legends */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-600 pt-2 border-t border-slate-100">
            {messagesAnalysis.breakdown.map((b) => (
              <div key={b.name} className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                <span>{b.name}: {b.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
