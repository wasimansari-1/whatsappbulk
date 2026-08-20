import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Bot,
  Plus,
  Zap,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit2,
  Sparkles,
  MessageSquare,
  Target,
  X,
  CheckCircle2
} from 'lucide-react';

export default function AutomationPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for new Chatbot Rule
  const [newRule, setNewRule] = useState({
    name: 'Price & Service Inquiry Auto-Reply',
    triggerType: 'KEYWORD',
    triggerConfig: {
      keyword: 'price, rate, cost, offer, catalog, discount'
    },
    nodes: [
      {
        id: 'node_1',
        type: 'SEND_MESSAGE',
        config: {
          text: 'Hello {{name}}! 👋 Thank you for reaching out to IGlobal Tech. Our plans start from ₹999/month. Please choose an option below:'
        }
      },
      {
        id: 'node_2',
        type: 'SEND_BUTTONS',
        config: {
          header: 'IGlobal Tech Services',
          body: 'Select what you are looking for:',
          footer: '24/7 WhatsApp AI Assistant',
          buttons: [
            { id: 'VIEW_CATALOG', title: 'View Catalog' },
            { id: 'TALK_TO_AGENT', title: 'Talk to Agent' },
            { id: 'BOOK_DEMO', title: 'Book Live Demo' }
          ]
        }
      },
      {
        id: 'node_3',
        type: 'CONVERT_LEAD',
        config: {
          stage: 'HOT',
          dealValue: 15000
        }
      }
    ]
  });

  // 1. Fetch Workflows
  const { data: workflowsRes, isLoading } = useQuery({
    queryKey: ['automation-workflows'],
    queryFn: () => api.get('/automation')
  });

  const workflows = workflowsRes?.data || [];

  // 2. Create Workflow Mutation
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/automation', data),
    onSuccess: () => {
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      alert('Chatbot automation workflow created and active on Meta Cloud API!');
    },
    onError: (err) => alert(err?.error?.message || err?.message || 'Error creating workflow')
  });

  // 3. Toggle Workflow Mutation
  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/automation/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
    }
  });

  // 4. Delete Workflow Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/automation/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Manual Chatbot & Automation Workflows</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automatic keyword replies, interactive WhatsApp buttons, and instant CRM lead capture.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Chatbot Rule</span>
        </button>
      </div>

      {/* 2. List of Chatbot Workflows */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-200">
            Loading workflows...
          </div>
        ) : workflows.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <Bot className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Chatbot rules created yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first automated keyword rule to instantly reply to incoming WhatsApp inquiries.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
            >
              Build First Bot Rule
            </button>
          </div>
        ) : (
          workflows.map((wf) => (
            <div
              key={wf._id}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">{wf.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        wf.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {wf.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold px-2 py-0.5 bg-slate-100 rounded-md font-mono text-[11px]">
                      Trigger: {wf.triggerType === 'KEYWORD' ? `Contains "${wf.triggerConfig?.keyword}"` : 'Button Click'}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="text-emerald-700 font-semibold">
                      {wf.nodes?.length || 1} Automated Actions (Reply + Interactive Buttons + Lead Capture)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end space-x-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-right text-xs">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Total Bot Replies</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{(wf.executionCount || 0).toLocaleString()}</p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleMutation.mutate(wf._id)}
                    className="text-emerald-600 hover:text-emerald-700 transition"
                    title={wf.isActive ? 'Pause Rule' : 'Activate Rule'}
                  >
                    {wf.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Delete this chatbot rule?')) deleteMutation.mutate(wf._id);
                    }}
                    className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. CREATE MANUAL CHATBOT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Create Manual Chatbot Rule</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newRule);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Workflow Name</label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trigger Keywords (Comma-separated words that activate this bot)
                </label>
                <input
                  type="text"
                  required
                  value={newRule.triggerConfig.keyword}
                  onChange={(e) =>
                    setNewRule({
                      ...newRule,
                      triggerConfig: { ...newRule.triggerConfig, keyword: e.target.value }
                    })
                  }
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-mono text-emerald-800 font-semibold"
                  placeholder="e.g. hi, hello, price, offer, service, booking, help"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  When a customer types any of these words on WhatsApp, this rule will trigger automatically.
                </p>
              </div>

              {/* Bot Response Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Auto Reply Message Text (Use <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">&#123;&#123;name&#125;&#125;</code> for customer name)
                </label>
                <textarea
                  rows="3"
                  required
                  value={newRule.nodes[0].config.text}
                  onChange={(e) => {
                    const updatedNodes = [...newRule.nodes];
                    updatedNodes[0].config.text = e.target.value;
                    setNewRule({ ...newRule, nodes: updatedNodes });
                  }}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              {/* Interactive Quick Reply CTA Buttons */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800">
                  Interactive WhatsApp Buttons (Quick Replies)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {newRule.nodes[1].config.buttons.map((btn, idx) => (
                    <input
                      key={btn.id}
                      type="text"
                      value={btn.title}
                      onChange={(e) => {
                        const updatedNodes = [...newRule.nodes];
                        updatedNodes[1].config.buttons[idx].title = e.target.value;
                        setNewRule({ ...newRule, nodes: updatedNodes });
                      }}
                      className="p-2 text-xs bg-white border border-slate-200 rounded-xl font-medium outline-none text-center"
                      placeholder={`Button ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* CRM Lead Auto Capture */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Auto-Create Lead in CRM Pipeline (Stage: HOT)</span>
                </div>
                <span className="font-bold text-emerald-700">₹15,000 Deal</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  {createMutation.isPending ? 'Deploying...' : 'Deploy Chatbot Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
