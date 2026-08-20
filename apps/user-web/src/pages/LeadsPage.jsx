import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Target,
  Plus,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Trash2,
  Edit2,
  X
} from 'lucide-react';

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', stage: 'NEW', dealValue: 0, source: 'WhatsApp' });

  // 1. Fetch Stage Counts
  const { data: countsRes } = useQuery({
    queryKey: ['lead-counts'],
    queryFn: () => api.get('/leads/counts')
  });

  const counts = countsRes?.data || {
    TOTAL: 0,
    NEW: 0,
    FOLLOW_UPS: 0,
    HOT: 0,
    IN_PROGRESS: 0,
    CONVERTED: 0,
    DISQUALIFIED: 0
  };

  // 2. Fetch Leads
  const { data: leadsRes, isLoading } = useQuery({
    queryKey: ['leads', selectedStage, searchQuery],
    queryFn: () =>
      api.get('/leads', {
        params: {
          stage: selectedStage === 'ALL' ? undefined : selectedStage,
          search: searchQuery || undefined
        }
      })
  });

  const leads = leadsRes?.data || [];

  // 3. Create Lead Mutation
  const createLeadMutation = useMutation({
    mutationFn: (data) => api.post('/leads', data),
    onSuccess: () => {
      setIsCreateModalOpen(false);
      setNewLead({ name: '', phone: '', email: '', stage: 'NEW', dealValue: 0, source: 'WhatsApp' });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
    }
  });

  // 4. Update Stage Mutation
  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }) => api.patch(`/leads/${id}/stage`, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-counts'] });
    }
  });

  const stagesList = [
    { key: 'ALL', label: 'Total Leads', count: counts.TOTAL, color: 'border-b-2 border-emerald-500 bg-emerald-50/40 text-emerald-800' },
    { key: 'NEW', label: 'New', count: counts.NEW, color: 'bg-green-50/50 text-green-800' },
    { key: 'FOLLOW_UPS', label: 'Follow Ups', count: counts.FOLLOW_UPS, color: 'bg-amber-50/50 text-amber-800' },
    { key: 'HOT', label: 'Hot', count: counts.HOT, color: 'bg-rose-50/50 text-rose-800' },
    { key: 'IN_PROGRESS', label: 'In Progress', count: counts.IN_PROGRESS, color: 'bg-blue-50/50 text-blue-800' },
    { key: 'CONVERTED', label: 'Converted', count: counts.CONVERTED, color: 'bg-emerald-50/50 text-emerald-800' },
    { key: 'DISQUALIFIED', label: 'Disqualified', count: counts.DISQUALIFIED, color: 'bg-slate-50/50 text-slate-700' }
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* 1. Pipeline Summary Tabs (Matching Screenshot 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {stagesList.map((st) => (
          <button
            key={st.key}
            onClick={() => setSelectedStage(st.key)}
            className={`p-3.5 rounded-xl border border-slate-200/80 text-left transition ${
              selectedStage === st.key ? st.color + ' ring-1 ring-emerald-400' : 'bg-white hover:bg-slate-50'
            }`}
          >
            <p className="text-xl font-black text-slate-900 leading-none">{st.count}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 truncate">{st.label}</p>
          </button>
        ))}
      </div>

      {/* 2. Subheader Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-lg font-extrabold text-slate-900">Leads</h1>

        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs outline-none shadow-xs w-48 lg:w-64"
            />
          </div>

          <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Last 7 Days</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Lead +</span>
          </button>
        </div>
      </div>

      {/* 3. Leads Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">Source</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Stage</th>
                <th className="p-4">Deal Value</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">Loading leads...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    No data available
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-semibold text-slate-800">{lead.name}</td>
                    <td className="p-4 font-mono text-slate-700 font-medium">+{lead.phone}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {lead.source}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{lead.assignedTo?.name || '-'}</td>
                    <td className="p-4">
                      <select
                        value={lead.stage}
                        onChange={(e) => updateStageMutation.mutate({ id: lead._id, stage: e.target.value })}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none text-slate-700"
                      >
                        <option value="NEW">New</option>
                        <option value="FOLLOW_UPS">Follow Ups</option>
                        <option value="HOT">Hot</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="DISQUALIFIED">Disqualified</option>
                      </select>
                    </td>
                    <td className="p-4 font-bold text-slate-800">₹{lead.dealValue?.toLocaleString() || 0}</td>
                    <td className="p-4 text-slate-500">
                      {new Date(lead.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm('Delete lead?')) {
                            api.delete(`/leads/${lead._id}`).then(() => {
                              queryClient.invalidateQueries({ queryKey: ['leads'] });
                            });
                          }
                        }}
                        className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition text-slate-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Create Lead Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Create New Lead</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLeadMutation.mutate(newLead);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Name</label>
                <input
                  type="text"
                  required
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  placeholder="e.g. Vikas Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  placeholder="e.g. 919876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Value (₹)</label>
                <input
                  type="number"
                  value={newLead.dealValue}
                  onChange={(e) => setNewLead({ ...newLead, dealValue: Number(e.target.value) })}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  placeholder="15000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stage</label>
                <select
                  value={newLead.stage}
                  onChange={(e) => setNewLead({ ...newLead, stage: e.target.value })}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-medium text-slate-700"
                >
                  <option value="NEW">New</option>
                  <option value="FOLLOW_UPS">Follow Ups</option>
                  <option value="HOT">Hot</option>
                  <option value="IN_PROGRESS">In Progress</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  {createLeadMutation.isPending ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
