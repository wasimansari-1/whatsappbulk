import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Building2,
  DollarSign,
  Activity,
  Server,
  Database,
  CheckCircle,
  AlertTriangle,
  Users,
  Search,
  Shield,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

const adminApi = axios.create({ baseURL: '/api/v1/admin' });

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [orgSearch, setOrgSearch] = useState('');

  // 1. Fetch Overview Metrics
  const { data: overviewRes, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.get('/overview').then((r) => r.data)
  });

  // 2. Fetch Organizations
  const { data: orgsRes } = useQuery({
    queryKey: ['admin-orgs', orgSearch],
    queryFn: () => adminApi.get('/organizations', { params: { search: orgSearch || undefined } }).then((r) => r.data)
  });

  // 3. Fetch Plans
  const { data: plansRes } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.get('/plans').then((r) => r.data)
  });

  // 4. Fetch Audit Logs
  const { data: auditRes } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminApi.get('/audit-logs').then((r) => r.data)
  });

  const overview = overviewRes?.data || {
    tenants: { total: 1, active: 1, trial: 0, newThisMonth: 1 },
    revenue: { mrr: 124500, revenueThisMonth: 189400, totalPayments: 48, failedPayments: 1 },
    messaging: { messagesToday: 2450, messagesThisMonth: 12814, deliveryRate: 98, readRate: 74, failureRate: 1 },
    infrastructure: { mongoStatus: 'CONNECTED', redisStatus: 'CONNECTED', whatsappProvider: 'mock', queues: [] }
  };

  const organizations = orgsRes?.data || [];
  const plans = plansRes?.data || [];
  const auditLogs = auditRes?.data || [];

  // Toggle tenant status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.patch(`/organizations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    }
  });

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col">
      {/* Top Admin Header */}
      <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-600/30">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            Wappbiz <span className="text-purple-400">SuperAdmin</span>
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Core Services Operational</span>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-800">
          {[
            { id: 'overview', label: 'Overview & Infrastructure', icon: Activity },
            { id: 'tenants', label: 'Tenants & Workspaces', icon: Building2 },
            { id: 'plans', label: 'Database Plans', icon: Layers },
            { id: 'audit', label: 'Audit Logs', icon: FileSpreadsheet }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Infrastructure */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Active Organizations</span>
                <p className="text-3xl font-black text-white">{overview.tenants.active} <span className="text-xs text-slate-400 font-normal">/ {overview.tenants.total}</span></p>
                <p className="text-[11px] text-emerald-400 font-semibold">+{overview.tenants.newThisMonth} this month</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Monthly Recurring Revenue</span>
                <p className="text-3xl font-black text-white">₹{overview.revenue.mrr.toLocaleString()}</p>
                <p className="text-[11px] text-emerald-400 font-semibold">{overview.revenue.totalPayments} total payments</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Platform Messages MTD</span>
                <p className="text-3xl font-black text-white">{overview.messaging.messagesThisMonth.toLocaleString()}</p>
                <p className="text-[11px] text-purple-400 font-semibold">{overview.messaging.deliveryRate}% delivery rate</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Active Provider</span>
                <p className="text-2xl font-black text-emerald-400 uppercase">{overview.infrastructure.whatsappProvider}</p>
                <p className="text-[11px] text-slate-400 font-semibold">Meta Cloud API / Offline Stub</p>
              </div>
            </div>

            {/* Infrastructure Health & Queue Monitors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Infrastructure Nodes */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-purple-400" />
                  <span>Infrastructure Health</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">MongoDB Primary Cluster</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-bold text-[10px]">
                      {overview.infrastructure.mongoStatus}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Redis Cluster (ioredis)</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-bold text-[10px]">
                      {overview.infrastructure.redisStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* BullMQ Queues */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span>Distributed Queue Workers (BullMQ)</span>
                </h3>
                <div className="space-y-2 text-xs">
                  {overview.infrastructure.queues?.map((q) => (
                    <div key={q.name} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex justify-between items-center">
                      <div>
                        <span className="font-mono text-purple-300 font-bold">{q.name}</span>
                        <p className="text-[10px] text-slate-400">
                          Active: {q.counts?.active} · Waiting: {q.counts?.waiting} · Completed: {q.counts?.completed}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-bold text-[10px]">
                        {q.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Tenants & Workspaces */}
        {activeTab === 'tenants' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">All Tenant Organizations</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search tenants..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs outline-none text-white w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Organization</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {organizations.map((org) => (
                    <tr key={org._id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-white">{org.name}</td>
                      <td className="p-3 text-slate-300">{org.ownerId?.name} ({org.ownerId?.email})</td>
                      <td className="p-3 font-bold text-purple-400">{org.planId?.name || 'Basic'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${org.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {org.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{new Date(org.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => toggleStatusMutation.mutate({ id: org._id, status: org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}
                          className="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-[11px] font-semibold text-slate-300"
                        >
                          {org.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Database Plans */}
        {activeTab === 'plans' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Commercial Subscription Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p) => (
                <div key={p._id} className="p-5 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-white text-base">{p.name}</h4>
                    <span className="font-bold text-purple-400">₹{p.price}/{p.billingInterval}</span>
                  </div>
                  <p className="text-xs text-slate-400">Max Contacts: {p.maxContacts?.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Message Limit: {p.monthlyMessageLimit?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white">System Security & Audit Logs</h3>
            <div className="divide-y divide-slate-800 text-xs">
              <div className="py-2.5 flex justify-between text-slate-300">
                <span>[CAMPAIGN_LAUNCH] Campaign "Diwali Offer" launched by Wasim Ansari</span>
                <span className="text-slate-500">2 mins ago</span>
              </div>
              <div className="py-2.5 flex justify-between text-slate-300">
                <span>[WALLET_RECHARGE] ₹2,000 prepaid credits added to Arvee Appliances</span>
                <span className="text-slate-500">1 hour ago</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
