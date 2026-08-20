import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  XCircle,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Sparkles,
  Send,
  Zap,
  Users,
  CheckCheck
} from 'lucide-react';

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Campaign Form State (9 Steps)
  const [formData, setFormData] = useState({
    name: '',
    whatsappPhoneNumberId: '',
    audienceType: 'ALL',
    targetTags: [],
    templateId: '',
    variableMapping: { 1: 'Name' },
    scheduledAt: null,
    sendSpeedPerMinute: 60
  });

  // 1. Fetch Campaigns
  const { data: campaignsRes, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns')
  });

  const campaigns = campaignsRes?.data || [];

  // 2. Fetch Templates & Phone numbers for builder
  const { data: templatesRes } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/whatsapp/templates')
  });

  const { data: profileRes } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/whatsapp/profile')
  });

  const templates = templatesRes?.data || [];
  const activePhoneNumber = profileRes?.data?.activePhoneNumber || null;
  const selectedTemplate = templates.find((t) => t._id === formData.templateId) || templates[0] || null;

  // 3. Socket.IO Real-time Campaign Progress Listeners
  useSocket({
    'campaign.progress': (payload) => {
      queryClient.setQueryData(['campaigns'], (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((camp) =>
            camp._id === payload.campaignId
              ? { ...camp, stats: payload.stats, status: payload.status }
              : camp
          )
        };
      });
    }
  });

  // 4. Launch Campaign Mutation
  const launchMutation = useMutation({
    mutationFn: (payload) => api.post('/campaigns', payload),
    onSuccess: () => {
      setIsBuilderOpen(false);
      setCurrentStep(1);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      alert('Campaign launched successfully into background processing queue!');
    }
  });

  const handleLaunch = () => {
    launchMutation.mutate({
      name: formData.name || `Broadcast Campaign ${new Date().toLocaleDateString()}`,
      whatsappPhoneNumberId: activePhoneNumber?._id || formData.whatsappPhoneNumberId,
      templateId: selectedTemplate?._id,
      audienceType: formData.audienceType,
      targetTags: formData.targetTags,
      variableMapping: formData.variableMapping,
      scheduledAt: formData.scheduledAt,
      sendSpeedPerMinute: formData.sendSpeedPerMinute
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">WhatsApp Broadcast Campaigns</h1>
          <p className="text-xs text-slate-500 mt-0.5">Create, schedule and monitor bulk WhatsApp outreach campaigns.</p>
        </div>

        <button
          onClick={() => {
            if (activePhoneNumber) {
              setFormData((prev) => ({ ...prev, whatsappPhoneNumberId: activePhoneNumber._id }));
            }
            if (templates[0]) {
              setFormData((prev) => ({ ...prev, templateId: templates[0]._id }));
            }
            setIsBuilderOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign (9-Step Wizard)</span>
        </button>
      </div>

      {/* 2. Campaign List & Real-time Progress Monitor */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-200">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto stroke-[1.2]" />
            <h3 className="text-sm font-bold text-slate-800">No campaigns launched yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Launch your first bulk marketing broadcast to engage customers directly on WhatsApp.
            </p>
          </div>
        ) : (
          campaigns.map((camp) => {
            const stats = camp.stats || { totalRecipients: 0, sent: 0, delivered: 0, read: 0, failed: 0, queued: 0 };
            const progress = stats.totalRecipients > 0 ? Math.min(100, Math.round(((stats.sent + stats.failed) / stats.totalRecipients) * 100)) : 0;

            return (
              <div
                key={camp._id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900">{camp.name}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          camp.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : camp.status === 'PROCESSING'
                            ? 'bg-blue-50 text-blue-700 animate-pulse'
                            : camp.status === 'SCHEDULED'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Template: <span className="font-semibold text-slate-600">{camp.templateId?.name || 'welcome_greeting'}</span> · Started: {camp.startedAt ? new Date(camp.startedAt).toLocaleString() : 'Pending'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {camp.status === 'PROCESSING' && (
                      <button
                        onClick={() => api.post(`/campaigns/${camp._id}/cancel`)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Real-time Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Sending Progress ({progress}%)</span>
                    <span>{stats.sent + stats.failed} / {stats.totalRecipients}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${(stats.delivered / (stats.totalRecipients || 1)) * 100}%` }} className="bg-brand-500 h-full transition-all" title="Delivered" />
                    <div style={{ width: `${((stats.sent - stats.delivered) / (stats.totalRecipients || 1)) * 100}%` }} className="bg-blue-400 h-full transition-all" title="Sent" />
                    <div style={{ width: `${(stats.failed / (stats.totalRecipients || 1)) * 100}%` }} className="bg-rose-500 h-full transition-all" title="Failed" />
                  </div>
                </div>

                {/* Recipient Stats Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Queued</span>
                    <p className="font-bold text-slate-800 mt-0.5">{stats.queued}</p>
                  </div>
                  <div className="bg-blue-50/60 p-2 rounded-xl">
                    <span className="text-blue-500 text-[10px] font-bold uppercase">Sent</span>
                    <p className="font-bold text-blue-900 mt-0.5">{stats.sent}</p>
                  </div>
                  <div className="bg-emerald-50/60 p-2 rounded-xl">
                    <span className="text-emerald-500 text-[10px] font-bold uppercase">Delivered</span>
                    <p className="font-bold text-emerald-900 mt-0.5">{stats.delivered}</p>
                  </div>
                  <div className="bg-purple-50/60 p-2 rounded-xl">
                    <span className="text-purple-500 text-[10px] font-bold uppercase">Read</span>
                    <p className="font-bold text-purple-900 mt-0.5">{stats.read}</p>
                  </div>
                  <div className="bg-rose-50/60 p-2 rounded-xl">
                    <span className="text-rose-500 text-[10px] font-bold uppercase">Failed</span>
                    <p className="font-bold text-rose-900 mt-0.5">{stats.failed}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. 9-STEP PROFESSIONAL CAMPAIGN BUILDER MODAL */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Wizard Header & Step Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">Step {currentStep} of 9</span>
                <h2 className="text-base font-extrabold text-slate-900">
                  {currentStep === 1 && '1. Campaign Name & Channel'}
                  {currentStep === 2 && '2. WhatsApp Phone Number'}
                  {currentStep === 3 && '3. Target Audience Selection'}
                  {currentStep === 4 && '4. Select Approved Template'}
                  {currentStep === 5 && '5. Dynamic Variable Mapping'}
                  {currentStep === 6 && '6. Interactive WhatsApp Preview'}
                  {currentStep === 7 && '7. Schedule & Dispatch Mode'}
                  {currentStep === 8 && '8. Rate Limiting & Safety Review'}
                  {currentStep === 9 && '9. Final Launch Confirmation'}
                </h2>
              </div>
              <button onClick={() => setIsBuilderOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Campaign Name */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Campaign Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali Chimney Cleaning Flash Offer 2026"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Phone Number */}
            {currentStep === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Select verified Meta WhatsApp number to dispatch broadcast:</p>
                <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">{activePhoneNumber?.verifiedName || 'Arvee Appliances'}</p>
                    <p className="text-xs font-mono text-slate-600">{activePhoneNumber?.displayPhoneNumber || '+91 87009 94288'}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">CONNECTED</span>
                </div>
              </div>
            )}

            {/* Step 3: Audience */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-700">Target Audience</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, audienceType: 'ALL' })}
                    className={`p-4 rounded-xl border text-left text-xs transition ${
                      formData.audienceType === 'ALL' ? 'border-brand-500 bg-emerald-50/40 font-bold' : 'border-slate-200'
                    }`}
                  >
                    <Users className="w-5 h-5 text-brand-600 mb-1" />
                    All Customers (2,223)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, audienceType: 'TAGS', targetTags: ['Chimney Service'] })}
                    className={`p-4 rounded-xl border text-left text-xs transition ${
                      formData.audienceType === 'TAGS' ? 'border-brand-500 bg-emerald-50/40 font-bold' : 'border-slate-200'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 text-purple-600 mb-1" />
                    By Tag: "Chimney Service"
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Template Selector */}
            {currentStep === 4 && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Select Approved Template</label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {templates.map((tpl) => (
                    <button
                      key={tpl._id}
                      type="button"
                      onClick={() => setFormData({ ...formData, templateId: tpl._id })}
                      className={`w-full p-3 rounded-xl border text-left text-xs flex items-center justify-between transition ${
                        (formData.templateId === tpl._id || (!formData.templateId && templates[0]?._id === tpl._id))
                          ? 'border-brand-500 bg-emerald-50/50 font-bold'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="text-slate-800">{tpl.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{tpl.category} · {tpl.language}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">APPROVED</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Variable Mapping */}
            {currentStep === 5 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Map template dynamic parameters:</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-700">&#123;&#123;1&#125;&#125; Parameter</span>
                  <span className="text-emerald-700 font-semibold">Mapped to: Contact Name</span>
                </div>
              </div>
            )}

            {/* Step 6: Live WhatsApp Mobile Preview */}
            {currentStep === 6 && (
              <div className="flex flex-col items-center justify-center p-4 bg-slate-100 rounded-2xl">
                <div className="w-72 bg-white rounded-3xl shadow-xl border-4 border-slate-800 overflow-hidden">
                  <div className="bg-[#075E54] text-white p-3 flex items-center space-x-2 text-xs font-bold">
                    <Smartphone className="w-4 h-4" />
                    <span>Arvee Appliances</span>
                  </div>
                  <div className="p-4 whatsapp-chat-bg min-h-[180px] text-xs space-y-2">
                    <div className="bg-white p-3 rounded-2xl shadow-xs space-y-2">
                      <p className="font-bold text-slate-800">Welcome To CHIMNEY SOLUTIONS</p>
                      <p className="text-slate-700 leading-relaxed text-[11px]">
                        Respected Wasim Ansari, Welcome To CHIMNEY SOLUTIONS. We are glad to have you here!
                      </p>
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="w-full py-1 text-center bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold text-emerald-700">
                          Raise a Request
                        </div>
                        <div className="w-full py-1 text-center bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold text-emerald-700">
                          Product/Service Feedback
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Schedule */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-700">Dispatch Timing</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scheduledAt: null })}
                    className={`p-4 rounded-xl border text-left text-xs ${
                      !formData.scheduledAt ? 'border-brand-500 bg-emerald-50/40 font-bold' : 'border-slate-200'
                    }`}
                  >
                    <Zap className="w-5 h-5 text-amber-500 mb-1" />
                    Send Immediately (Queued Now)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scheduledAt: new Date(Date.now() + 86400000).toISOString() })}
                    className={`p-4 rounded-xl border text-left text-xs ${
                      formData.scheduledAt ? 'border-brand-500 bg-emerald-50/40 font-bold' : 'border-slate-200'
                    }`}
                  >
                    <Calendar className="w-5 h-5 text-blue-500 mb-1" />
                    Schedule for Tomorrow
                  </button>
                </div>
              </div>
            )}

            {/* Step 8: Rate Limiting & Safety */}
            {currentStep === 8 && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-700">Meta Safe Dispatch Speed</label>
                <select
                  value={formData.sendSpeedPerMinute}
                  onChange={(e) => setFormData({ ...formData, sendSpeedPerMinute: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="60">60 messages / minute (Recommended Safe Speed)</option>
                  <option value="120">120 messages / minute (Medium Tier)</option>
                  <option value="300">300 messages / minute (High Tier)</option>
                </select>
                <p className="text-[11px] text-slate-400">
                  BullMQ distributed queue will automatically stagger messages to respect Meta Business limits.
                </p>
              </div>
            )}

            {/* Step 9: Review & Launch */}
            {currentStep === 9 && (
              <div className="space-y-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                <h3 className="text-xs font-bold text-emerald-900">Campaign Summary Review</h3>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <p><strong>Campaign Name:</strong> {formData.name || 'Special Broadcast'}</p>
                  <p><strong>Audience:</strong> 2,223 Recipients</p>
                  <p><strong>Template:</strong> {selectedTemplate?.name}</p>
                  <p><strong>Estimated Cost:</strong> ₹{(2223 * 0.40).toFixed(2)} (Deducted from prepaid wallet)</p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-50 flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              {currentStep < 9 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center space-x-1"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={launchMutation.isPending}
                  onClick={handleLaunch}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-500/30 flex items-center space-x-1.5 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>{launchMutation.isPending ? 'Launching Queue...' : 'Confirm & Launch Campaign'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
