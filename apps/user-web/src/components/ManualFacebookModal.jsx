import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  X,
  Facebook,
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  ChevronRight,
  ChevronLeft,
  Building2,
  Lock,
  Zap,
  Target
} from 'lucide-react';

export default function ManualFacebookModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [showToken, setShowToken] = useState(false);

  const [formData, setFormData] = useState({
    pageId: '',
    pageName: '',
    pageCategory: 'Business & Brand',
    pageAccessToken: '',
    adAccountId: ''
  });

  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState(null);

  // Manual Page Connection Mutation
  const connectMutation = useMutation({
    mutationFn: (payload) => api.post('/meta-ads/connect-page', payload),
    onSuccess: (res) => {
      setVerificationResult(res.data || res);
      setVerificationError(null);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ['meta-business-overview'] });
      queryClient.invalidateQueries({ queryKey: ['facebook-pages-list'] });
      queryClient.invalidateQueries({ queryKey: ['meta-lead-forms'] });
      toast.success('Facebook Page connected and subscribed to lead webhooks!', 'Connected Successfully');
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.message || err.message || 'Facebook Page verification failed.';
      setVerificationError({ message: errorMsg });
      setStep(3);
      toast.error(errorMsg, 'Connection Failed');
    }
  });

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.pageId.trim() || !formData.pageAccessToken.trim()) {
      toast.error('Page ID and Page Access Token are required.', 'Missing Fields');
      return;
    }
    setVerificationResult(null);
    setVerificationError(null);
    connectMutation.mutate({
      pageId: formData.pageId.trim(),
      pageName: formData.pageName.trim() || 'Facebook Page',
      pageCategory: formData.pageCategory.trim(),
      adAccountId: formData.adAccountId.trim(),
      pageAccessToken: formData.pageAccessToken.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="p-6 bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Facebook className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Manual Facebook Page Connection</h2>
              <p className="text-xs text-blue-100/80">Connect your Facebook Page & Lead Ads with encrypted Page Access Tokens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          {[
            { num: 1, label: 'Page Setup Guide' },
            { num: 2, label: 'Page Credentials' },
            { num: 3, label: 'Verification' }
          ].map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <button
                key={s.num}
                onClick={() => {
                  if (s.num <= 2 || verificationResult || verificationError) setStep(s.num);
                }}
                className={`flex items-center space-x-2 font-bold transition ${
                  isCurrent
                    ? 'text-blue-700'
                    : isCompleted
                    ? 'text-slate-700 hover:text-slate-900'
                    : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
          {/* STEP 1: PAGE SETUP GUIDE */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start space-x-3">
                <Building2 className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-blue-950 text-sm">Step 1: Get Page ID & Page Access Token</h4>
                  <p className="text-blue-800 leading-relaxed">
                    To capture real-time Facebook Lead Ads into your CRM, you need a Facebook Page ID and a Page Access Token with <code>leads_retrieval</code> permission.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>1. Find your Facebook Page ID</span>
                    <a
                      href="https://facebook.com/pages"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center space-x-0.5"
                    >
                      <span className="text-[11px]">facebook.com/pages</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </h5>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Open your Facebook Page ➡️ Click <strong>About ➡️ Page transparency</strong> to view your numeric Page ID.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900">2. Generate Page Access Token</h5>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    In Graph API Explorer or Meta Business Suite, generate a Page token with <code>pages_show_list</code> and <code>leads_retrieval</code> scopes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CREDENTIALS FORM */}
          {step === 2 && (
            <form id="manual-fb-form" onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center space-x-2 text-slate-600">
                <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-[11px]">
                  Page access tokens are encrypted with <strong>AES-256-GCM</strong> and strictly tenant-isolated.
                </span>
              </div>

              {/* Page ID */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Facebook Page ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1049968644261349"
                  value={formData.pageId}
                  onChange={(e) => handleInputChange('pageId', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Page Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Facebook Page Name</label>
                <input
                  type="text"
                  placeholder="e.g. Street Vibe / IGlobal Tech"
                  value={formData.pageName}
                  onChange={(e) => handleInputChange('pageName', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Page Access Token */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Page Access Token *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Begins with EAA...</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    required
                    placeholder="EAA..."
                    value={formData.pageAccessToken}
                    onChange={(e) => handleInputChange('pageAccessToken', e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden truncate"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Meta Ad Account ID (Optional) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Meta Ad Account ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. act_123456789"
                  value={formData.adAccountId}
                  onChange={(e) => handleInputChange('adAccountId', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </form>
          )}

          {/* STEP 3: VERIFICATION RESULT */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {connectMutation.isPending && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Subscribing Facebook Page Webhooks...</h4>
                    <p className="text-slate-500 text-xs mt-1">Connecting Page to real-time Lead Ads webhook ingestion.</p>
                  </div>
                </div>
              )}

              {verificationResult && !connectMutation.isPending && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 flex items-start space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-blue-950 text-sm">Facebook Page Connected!</h4>
                      <p className="text-blue-800 text-[11px] leading-relaxed">
                        Your Facebook Page is now connected. Any new leads submitted via Facebook Instant Forms will be routed into your CRM automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {verificationError && !connectMutation.isPending && (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-start space-x-3">
                    <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-rose-950 text-sm">Facebook Connection Failed</h4>
                      <p className="text-rose-800 text-[11px] leading-relaxed">
                        {verificationError.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            {step > 1 && step < 3 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold transition"
            >
              {verificationResult ? 'Close' : 'Cancel'}
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                type="submit"
                form="manual-fb-form"
                disabled={connectMutation.isPending}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
              >
                {connectMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Connect Page</span>
                  </>
                )}
              </button>
            )}

            {step === 3 && verificationError && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Retry
              </button>
            )}

            {step === 3 && verificationResult && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
