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
  X
} from 'lucide-react';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: 'festive_flash_sale_offer',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Exclusive Offer For You! 🎁'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}}, get 20% off on all services this week! Valid for next 48 hours only.'
      },
      {
        type: 'FOOTER',
        text: 'Reply STOP to opt out'
      },
      {
        type: 'BUTTONS',
        buttons: [{ type: 'QUICK_REPLY', text: 'Claim Offer' }, { type: 'QUICK_REPLY', text: 'Contact Support' }]
      }
    ]
  });

  // 1. Fetch Templates
  const { data: templatesRes, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/whatsapp/templates')
  });

  const templates = templatesRes?.data || [];

  // 2. Sync Templates from Meta Mutation
  const syncMutation = useMutation({
    mutationFn: () => api.post('/whatsapp/sync'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert(`Templates Synced with Meta Graph API! Total: ${res.data?.syncedTemplates || templates.length}`);
    }
  });

  // 3. Create Template on Meta Mutation
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/templates', data),
    onSuccess: () => {
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert('Template created and submitted directly to Meta Graph API for approval!');
    },
    onError: (err) => alert(err?.error?.message || err?.message || 'Error creating template')
  });

  // 4. Delete Template Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/whatsapp/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">WhatsApp Message Templates</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Meta-compliant pre-approved message templates for business broadcasts (Connected to Meta WABA 1049968644261349).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{syncMutation.isPending ? 'Syncing...' : 'Sync from Meta'}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Meta Template</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading templates from Meta...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 space-y-2">
            <p className="font-semibold text-slate-700">No message templates found on this WABA yet.</p>
            <p>Click [Create Meta Template] or [Sync from Meta] to submit templates directly to Meta Cloud API.</p>
          </div>
        ) : (
          templates.map((tpl) => {
            const header = tpl.components?.find((c) => c.type === 'HEADER');
            const body = tpl.components?.find((c) => c.type === 'BODY');
            const buttons = tpl.components?.find((c) => c.type === 'BUTTONS')?.buttons || [];

            return (
              <div key={tpl._id} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {tpl.category} · {tpl.language}
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{tpl.status || 'APPROVED'}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{tpl.name}</h3>

                  {/* Simulated WhatsApp Preview bubble */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs space-y-2 text-slate-800">
                    {header?.text && <p className="font-bold text-slate-900">{header.text}</p>}
                    <p className="whitespace-pre-line text-slate-700 leading-relaxed text-[11px]">{body?.text}</p>
                    {buttons.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        {buttons.map((btn, idx) => (
                          <div key={idx} className="py-1 bg-white border border-slate-200 rounded text-center text-[10px] font-semibold text-emerald-700">
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (confirm('Delete this template from Meta WABA?')) deleteMutation.mutate(tpl._id);
                    }}
                    className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE TEMPLATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Submit Template to Meta Graph API</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newTemplate);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Name (Lowercase & underscores only)
                </label>
                <input
                  type="text"
                  required
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="MARKETING">MARKETING</option>
                    <option value="UTILITY">UTILITY</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
                  <select
                    value={newTemplate.language}
                    onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="en_US">English (en_US)</option>
                    <option value="hi">Hindi (hi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Body Text (Use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; for dynamic variables)</label>
                <textarea
                  rows="4"
                  required
                  value={newTemplate.components[1].text}
                  onChange={(e) => {
                    const comps = [...newTemplate.components];
                    comps[1].text = e.target.value;
                    setNewTemplate({ ...newTemplate, components: comps });
                  }}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  {createMutation.isPending ? 'Submitting to Meta...' : 'Submit to Meta for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
