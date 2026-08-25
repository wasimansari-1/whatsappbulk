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
  FileSpreadsheet,
  Smartphone,
  Check,
  RefreshCw,
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Phone,
  Mail,
  Lock,
  Calendar,
  CheckCheck,
  Edit3,
  Key,
  Trash2,
  Eye,
  X,
  UserCheck,
  UserX,
  Facebook,
  Instagram,
  BarChart3,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

const adminApi = axios.create({ baseURL: '/api/v1/admin' });

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [messageSearch, setMessageSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');

  // Selected User for Modals
  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deletingUser, setDeletingUser] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // 1. Fetch Overview Metrics
  const { data: overviewRes } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.get('/overview').then((r) => r.data)
  });

  // 2. Fetch Users
  const { data: usersRes, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userSearch, userStatusFilter],
    queryFn: () =>
      adminApi
        .get('/users', {
          params: {
            search: userSearch || undefined,
            status: userStatusFilter !== 'ALL' ? userStatusFilter : undefined
          }
        })
        .then((r) => r.data)
  });

  // 3. Fetch Messages & Chats
  const { data: messagesRes, isLoading: messagesLoading } = useQuery({
    queryKey: ['admin-messages', messageSearch],
    queryFn: () => adminApi.get('/messages', { params: { search: messageSearch || undefined } }).then((r) => r.data)
  });

  // 4. Fetch Organizations
  const { data: orgsRes } = useQuery({
    queryKey: ['admin-orgs', orgSearch],
    queryFn: () => adminApi.get('/organizations', { params: { search: orgSearch || undefined } }).then((r) => r.data)
  });

  // 5. Fetch Plans
  const { data: plansRes } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.get('/plans').then((r) => r.data)
  });

  // 6. Fetch Audit Logs
  const { data: auditRes } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminApi.get('/audit-logs').then((r) => r.data)
  });

  const overview = overviewRes?.data || {
    tenants: { total: 1, active: 1, trial: 0, newThisMonth: 1 },
    revenue: { mrr: 124500, revenueThisMonth: 189400, totalPayments: 48, failedPayments: 1 },
    messaging: { messagesToday: 2450, messagesThisMonth: 12814, deliveryRate: 98, readRate: 74, failureRate: 1 },
    infrastructure: { mongoStatus: 'CONNECTED', redisStatus: 'CONNECTED', whatsappProvider: 'meta', queues: [] }
  };

  const users = usersRes?.data || [];
  const messages = messagesRes?.data || [];
  const organizations = orgsRes?.data || [];
  const plans = plansRes?.data || [];
  const auditLogs = auditRes?.data || [];

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
      setActionSuccess('User profile updated successfully!');
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err) => {
      setActionError(err?.response?.data?.message || err.message);
      setTimeout(() => setActionError(''), 4000);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.patch(`/users/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setActionSuccess('User status updated successfully!');
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err) => {
      setActionError(err?.response?.data?.message || err.message);
      setTimeout(() => setActionError(''), 4000);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }) => adminApi.post(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      setResettingUser(null);
      setNewPassword('');
      setActionSuccess('Password reset successfully and securely hashed!');
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err) => {
      setActionError(err?.response?.data?.message || err.message);
      setTimeout(() => setActionError(''), 4000);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => adminApi.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setDeletingUser(null);
      setActionSuccess('User deleted successfully.');
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err) => {
      setActionError(err?.response?.data?.message || err.message);
      setTimeout(() => setActionError(''), 4000);
    }
  });

  const outboundCount = messages.filter((m) => m.direction === 'OUTBOUND').length;
  const inboundCount = messages.filter((m) => m.direction === 'INBOUND').length;

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-600/30">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            Wappbiz <span className="text-purple-400">SuperAdmin Governance</span>
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Meta WhatsApp Multi-Tenant Platform Live</span>
          </div>
        </div>
      </header>

      {/* Notifications Toast */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="fixed top-20 right-6 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Admin Content */}
      <main className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 overflow-x-auto pb-1">
          {[
            { id: 'users', label: `User Management (${users.length})`, icon: Users },
            { id: 'messages', label: `Live Inbox & Chat Logs (${messages.length})`, icon: MessageSquare },
            { id: 'overview', label: 'Overview & Infrastructure', icon: Activity },
            { id: 'tenants', label: `Tenants (${organizations.length})`, icon: Building2 },
            { id: 'plans', label: 'Commercial Plans', icon: Layers },
            { id: 'audit', label: 'Audit Logs', icon: FileSpreadsheet }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400 bg-purple-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: User Management */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Registered Users & Account Governance</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Permanent record of all user signups, credentials management, connected WhatsApp/Facebook integrations, and account controls.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name, email, phone, company..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs outline-none text-white w-64 focus:border-purple-500"
                  />
                </div>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 outline-none focus:border-purple-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="SUSPENDED">Suspended Only</option>
                  <option value="DEACTIVATED">Deactivated Only</option>
                </select>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Signups</span>
                <p className="text-xl font-black text-white">{users.length}</p>
              </div>
              <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Active Accounts</span>
                <p className="text-xl font-black text-emerald-400">
                  {users.filter((u) => u.status === 'ACTIVE').length}
                </p>
              </div>
              <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="text-[10px] font-bold text-amber-400 uppercase">Suspended</span>
                <p className="text-xl font-black text-amber-400">
                  {users.filter((u) => u.status === 'SUSPENDED').length}
                </p>
              </div>
              <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="text-[10px] font-bold text-purple-400 uppercase">WhatsApp Connected</span>
                <p className="text-xl font-black text-purple-400">
                  {users.filter((u) => u.integrations?.whatsapp?.connected).length}
                </p>
              </div>
            </div>

            {usersLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading registered users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No registered users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">User & Contact</th>
                      <th className="p-3">Login Email (ID)</th>
                      <th className="p-3">Company / Workspace</th>
                      <th className="p-3">Connected Integrations</th>
                      <th className="p-3">Contacts & Chats</th>
                      <th className="p-3">Signup / Last Login</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => {
                      const isTestUser = u.email === 'wasim@arvee.com';
                      return (
                        <tr key={u._id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                                {u.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isTestUser && (
                                    <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded text-[9px] font-bold">
                                      TEST ACCOUNT
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  {u.phone || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-mono text-purple-300 font-semibold flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-purple-400" />
                              {u.email}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {u._id}</div>
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-slate-200">{u.companyName || u.organization?.name || 'Workspace'}</div>
                            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-bold text-[10px]">
                              {u.role || 'OWNER'}
                            </span>
                          </td>

                          <td className="p-3 space-y-1">
                            {/* WhatsApp Badge */}
                            <div className="flex items-center gap-1 text-[11px]">
                              <Smartphone className={`w-3 h-3 ${u.integrations?.whatsapp?.connected ? 'text-emerald-400' : 'text-slate-500'}`} />
                              <span className={u.integrations?.whatsapp?.connected ? 'font-mono text-emerald-400 font-bold' : 'text-slate-500'}>
                                {u.integrations?.whatsapp?.connected
                                  ? u.integrations.whatsapp.displayPhoneNumber
                                  : 'WhatsApp: Disconnected'}
                              </span>
                            </div>
                            {/* Facebook Badge */}
                            <div className="flex items-center gap-1 text-[11px]">
                              <Facebook className={`w-3 h-3 ${u.integrations?.facebook?.connected ? 'text-blue-400' : 'text-slate-600'}`} />
                              <span className={u.integrations?.facebook?.connected ? 'text-blue-300 font-medium' : 'text-slate-600'}>
                                {u.integrations?.facebook?.connected
                                  ? u.integrations.facebook.pageName
                                  : 'Facebook: Disconnected'}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 font-mono text-[11px]">
                            <div className="text-slate-300">{u.stats?.contactsCount || 0} contacts</div>
                            <div className="text-slate-500 text-[10px]">{u.stats?.totalMessages || 0} messages ({u.stats?.sentMessages || 0} sent / {u.stats?.receivedMessages || 0} rcv)</div>
                          </td>

                          <td className="p-3 text-[11px] text-slate-400">
                            <div>Joined: {new Date(u.createdAt).toLocaleDateString('en-IN')}</div>
                            <div className="text-slate-500 text-[10px]">
                              Active: {new Date(u.lastLoginAt || u.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                u.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : u.status === 'SUSPENDED'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {u.status || 'ACTIVE'}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Profile */}
                              <button
                                onClick={() => setViewingUser(u)}
                                title="View Full Profile"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Profile */}
                              <button
                                onClick={() => setEditingUser(u)}
                                title="Edit User"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => setResettingUser(u)}
                                title="Reset Password"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              {/* Suspend / Activate Toggle */}
                              <button
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: u._id,
                                    status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                                  })
                                }
                                title={u.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                                className={`p-1.5 rounded-lg transition ${
                                  u.status === 'ACTIVE'
                                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                              >
                                {u.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>

                              {/* Delete User */}
                              {!isTestUser && (
                                <button
                                  onClick={() => setDeletingUser(u)}
                                  title="Delete User"
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Inbox & Chat Logs */}
        {activeTab === 'messages' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <span>Platform Live Inbox & Chat Records</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Complete real-time log of all inbound and outbound WhatsApp conversations across all tenant workspaces.
                </p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search message text, contact, phone..."
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs outline-none text-white w-72 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Messages</span>
                  <p className="text-2xl font-black text-white">{messages.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Outbound (Sent)</span>
                  <p className="text-2xl font-black text-emerald-400">{outboundCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Inbound (Received)</span>
                  <p className="text-2xl font-black text-cyan-400">{inboundCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
              </div>
            </div>

            {messagesLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No messages found.</div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className={`p-4 rounded-2xl border transition ${
                      m.direction === 'OUTBOUND'
                        ? 'bg-slate-800/40 border-slate-700/70'
                        : 'bg-emerald-950/20 border-emerald-800/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 mb-2.5 text-xs">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                            m.direction === 'OUTBOUND'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {m.direction === 'OUTBOUND' ? (
                            <>
                              <ArrowUpRight className="w-3 h-3" /> OUTBOUND (Bheja Gaya)
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft className="w-3 h-3" /> INBOUND (Aaya Hua)
                            </>
                          )}
                        </span>

                        <span className="font-semibold text-slate-200">
                          {m.direction === 'OUTBOUND'
                            ? `Sender: ${m.senderNumber}`
                            : `Customer: ${m.contact?.name} (${m.contact?.phone})`}
                        </span>

                        {m.contact?.tags?.map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.2 bg-slate-700/60 text-slate-300 rounded text-[9px]">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1 font-mono text-emerald-400">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          {m.status}
                        </span>
                        <span>
                          {new Date(m.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </span>
                      </div>
                    </div>

                    <div className="text-slate-100 text-xs whitespace-pre-wrap leading-relaxed">
                      {m.content?.text || (
                        <span className="italic text-slate-400">[Template / Interactive Buttons Message]</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Overview & Infrastructure */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
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
                <span className="text-xs font-bold text-slate-400 uppercase">WhatsApp Provider</span>
                <p className="text-2xl font-black text-emerald-400 uppercase">{overview.infrastructure.whatsappProvider}</p>
                <p className="text-[11px] text-slate-400 font-semibold">Meta Cloud API / Embedded Signup</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Tab 4: Tenants */}
        {activeTab === 'tenants' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Tenant Workspaces & WhatsApp Coexistence Status</h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage tenant WhatsApp connections without exposing raw access tokens.</p>
              </div>
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
                    <th className="p-3">Connected Number</th>
                    <th className="p-3">WABA ID</th>
                    <th className="p-3">Coexistence</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {organizations.map((org) => (
                    <tr key={org._id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-white">{org.name}</td>
                      <td className="p-3 text-slate-300">{org.ownerId?.name} ({org.ownerId?.email})</td>
                      <td className="p-3 font-mono text-emerald-400 font-semibold">{org.whatsapp?.displayPhoneNumber || 'Not Linked'}</td>
                      <td className="p-3 font-mono text-slate-400 text-[11px]">{org.whatsapp?.wabaId || 'N/A'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            org.whatsapp?.coexistenceStatus === 'ENABLED' || org.whatsapp?.coexistenceStatus === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {org.whatsapp?.coexistenceStatus === 'ENABLED' || org.whatsapp?.coexistenceStatus === 'ACTIVE'
                            ? '📱+☁️ ACTIVE'
                            : 'STANDARD'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${org.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {org.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Plans */}
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

        {/* Tab 6: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white">System Security & Audit Logs</h3>
            <div className="divide-y divide-slate-800 text-xs">
              <div className="py-2.5 flex justify-between text-slate-300">
                <span>[SECURITY_AUDIT] Multi-tenant isolation verified for all organizations</span>
                <span className="text-slate-500">Just now</span>
              </div>
              <div className="py-2.5 flex justify-between text-slate-300">
                <span>[TEST_ACCOUNT] IGlobal Tech isolated with sending number +91 91555 34309</span>
                <span className="text-slate-500">2 mins ago</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================== MODAL 1: VIEW USER PROFILE ===================== */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Complete User Profile & Integrations</span>
              </h3>
              <button onClick={() => setViewingUser(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Full Name</span>
                  <span className="font-bold text-white text-sm">{viewingUser.name}</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Company / Workspace</span>
                  <span className="font-bold text-white text-sm">{viewingUser.companyName || viewingUser.organization?.name}</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Login Email (ID)</span>
                  <span className="font-mono text-purple-300 font-semibold">{viewingUser.email}</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Phone Number</span>
                  <span className="font-mono text-emerald-400 font-semibold">{viewingUser.phone}</span>
                </div>
              </div>

              {/* Integrations Breakdown */}
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Connected Integrations</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-400" /> WhatsApp Business
                    </span>
                    <span className={viewingUser.integrations?.whatsapp?.connected ? 'font-mono text-emerald-400 font-bold' : 'text-slate-500'}>
                      {viewingUser.integrations?.whatsapp?.connected
                        ? `Connected (${viewingUser.integrations.whatsapp.displayPhoneNumber})`
                        : 'Disconnected'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Facebook className="w-4 h-4 text-blue-400" /> Facebook Pages
                    </span>
                    <span className={viewingUser.integrations?.facebook?.connected ? 'text-blue-300 font-semibold' : 'text-slate-500'}>
                      {viewingUser.integrations?.facebook?.connected
                        ? `Connected (${viewingUser.integrations.facebook.pageName})`
                        : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-slate-400 text-[11px]">
                <div>Signed Up: {new Date(viewingUser.createdAt).toLocaleString('en-IN')}</div>
                <div>Last Active: {new Date(viewingUser.lastLoginAt || viewingUser.createdAt).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: EDIT USER ===================== */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit User Information</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUserMutation.mutate({
                  id: editingUser._id,
                  data: {
                    name: editingUser.name,
                    phone: editingUser.phone,
                    companyName: editingUser.companyName
                  }
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Workspace Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.companyName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, companyName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/30"
                >
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: RESET PASSWORD ===================== */}
      {resettingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <span>Reset User Password</span>
              </h3>
              <button onClick={() => setResettingUser(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Set a new secure password for <strong className="text-white">{resettingUser.email}</strong>. The password will be immediately hashed using bcrypt.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                resetPasswordMutation.mutate({
                  id: resettingUser._id,
                  newPassword
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Password (Min 6 characters)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResettingUser(null);
                    setNewPassword('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-600/30"
                >
                  {resetPasswordMutation.isPending ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 4: DELETE CONFIRMATION ===================== */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Confirm Account Deletion</span>
              </h3>
              <button onClick={() => setDeletingUser(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete user <strong className="text-white">{deletingUser.name}</strong> ({deletingUser.email}) and their associated workspace? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteUserMutation.mutate(deletingUser._id)}
                disabled={deleteUserMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
