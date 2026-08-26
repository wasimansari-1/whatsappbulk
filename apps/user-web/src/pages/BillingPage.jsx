import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Wallet,
  Plus,
  Check,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Receipt,
  CreditCard,
  X
} from 'lucide-react';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(1000);

  const { data: billingRes, isLoading } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: () => api.get('/billing/overview')
  });

  const { data: plansRes } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: () => api.get('/billing/plans')
  });

  const overview = billingRes?.data || {
    wallet: { balance: 517.65, usedCredits: 1481.49 },
    subscription: { status: 'ACTIVE', currentPeriodEnd: '2026-11-19' },
    recentTransactions: []
  };

  const plans = plansRes?.data || [];

  const rechargeMutation = useMutation({
    mutationFn: (amount) => api.post('/billing/credits', { amount }),
    onSuccess: () => {
      setIsRechargeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['billing-overview'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      alert('Wallet recharged successfully!');
    }
  });

  const upgradeMutation = useMutation({
    mutationFn: (planId) => api.post('/billing/upgrade', { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-overview'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      alert('Subscription plan updated!');
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-16">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Billing, Wallet & Plans</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your prepaid WhatsApp credits and subscription tier.</p>
      </div>

      {/* 2. Top Wallet & Plan Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Meta WABA Account & Direct Billing Card */}
        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl shadow-blue-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Meta Cloud Account</span>
            </div>
            <a
              href={overview.metaBilling?.paymentHubUrl || 'https://business.facebook.com/billing_hub/accounts/details/?business_id=993604119807437&asset_id=1066070962481909&wizard_name=ADD_PM&account_type=whatsapp-business-account'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black transition shadow-sm flex items-center space-x-1"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Meta Hub ↗</span>
            </a>
          </div>

          <div className="my-4">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-3xl font-black">₹ {Number(overview.wallet?.balance || 0).toFixed(2)}</p>
            </div>
            <p className="text-xs text-blue-200 mt-1">
              Live Meta Cloud Balance ({overview.metaBilling?.messagingLimitTier || 'TIER_10K'} • {overview.metaBilling?.displayPhoneNumber || '+91 91555 34309'})
            </p>
          </div>

          <div className="pt-3 border-t border-blue-800/80 flex justify-between text-xs text-blue-200">
            <span>Quality Rating:</span>
            <span className="font-black text-emerald-400">{overview.metaBilling?.qualityRating || 'GREEN (High)'}</span>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Active Subscription</span>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full uppercase">
              {overview.subscription?.status || 'Active'}
            </span>
          </div>

          <div className="my-2">
            <h3 className="text-2xl font-black text-slate-900">{overview.subscription?.planId?.name || 'Basic Quarterly'}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Renews on: {overview.subscription?.currentPeriodEnd ? new Date(overview.subscription.currentPeriodEnd).toLocaleDateString() : '19 Nov 2026'}
            </p>
          </div>

          <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <p className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>5,000 Verified Contacts</span>
            </p>
            <p className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Team Inbox & CRM Enabled</span>
            </p>
          </div>
        </div>

        {/* Unit Cost Reference */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between text-xs">
          <span className="font-bold text-slate-700">Official Meta Messaging Rates</span>
          <div className="space-y-2 my-2 text-slate-600">
            <div className="flex justify-between">
              <span>Marketing Conversation:</span>
              <span className="font-bold text-slate-900">₹ 0.40 / msg</span>
            </div>
            <div className="flex justify-between">
              <span>Utility Conversation:</span>
              <span className="font-bold text-slate-900">₹ 0.12 / msg</span>
            </div>
            <div className="flex justify-between">
              <span>Service Conversation:</span>
              <span className="font-bold text-slate-900">Free (Within 24h)</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            Directly deducted from prepaid wallet upon carrier delivery receipt.
          </p>
        </div>
      </div>

      {/* 2.5 Official Meta Cloud API Payment Method & Direct Billing Hub Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                Official Meta Cloud API Direct Payment Hub
              </span>
            </div>
            <h2 className="text-xl font-black text-white">
              Connect & Recharge Meta WhatsApp Business Account
            </h2>
            <p className="text-xs text-blue-100/80 leading-relaxed">
              Meta WhatsApp Cloud API requires an active Payment Method (Credit/Debit Card) attached to your WhatsApp Business Account (<strong>WABA ID: 1066070962481909</strong>). Once added, your bulk messages and marketing campaigns will deliver without restriction.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-[11px] text-blue-200">
              <span className="flex items-center space-x-1.5 bg-white/10 px-3 py-1 rounded-lg border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>WABA ID: <strong>1066070962481909</strong></span>
              </span>
              <span className="flex items-center space-x-1.5 bg-white/10 px-3 py-1 rounded-lg border border-white/10">
                <span>Business ID: <strong>993604119807437</strong></span>
              </span>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <a
              href="https://business.facebook.com/billing_hub/accounts/details/?business_id=993604119807437&asset_id=1066070962481909&wizard_name=ADD_PM&account_type=whatsapp-business-account"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2 w-full md:w-auto px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/30 transition transform hover:-translate-y-0.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Add Payment Method on Meta Hub ↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* 3. Subscription Plan Comparison Tiers */}
      <div className="space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Available Subscription Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p) => {
            const isCurrent = overview.subscription?.planId?._id === p._id;
            return (
              <div
                key={p._id}
                className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between space-y-4 ${
                  p.isPopular ? 'border-2 border-emerald-500 shadow-lg' : 'border-slate-200/90 shadow-sm'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                    {p.isPopular && (
                      <span className="text-[10px] font-extrabold bg-emerald-500 text-white px-2 py-0.5 rounded-full">POPULAR</span>
                    )}
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-slate-900">₹{p.price.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 font-semibold">/{p.billingInterval.toLowerCase()}</span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                    <p className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{p.maxContacts?.toLocaleString()} Contacts Limit</span>
                    </p>
                    <p className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{p.maxUsers} Team Agent Seats</span>
                    </p>
                    <p className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{p.monthlyMessageLimit?.toLocaleString()} Monthly Campaign Limit</span>
                    </p>
                  </div>
                </div>

                <button
                  disabled={isCurrent || upgradeMutation.isPending}
                  onClick={() => upgradeMutation.mutate(p._id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Wallet Top-up Modal */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Prepaid Credits</h3>
              <button onClick={() => setIsRechargeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-1.5 text-blue-900 font-bold text-xs">
                <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Meta WhatsApp Cloud API Direct Card Setup</span>
              </div>
              <p className="text-[11px] text-blue-700 leading-tight">
                To clear Meta Error 131042, ensure a payment method is attached directly to your Meta WABA.
              </p>
              <a
                href="https://business.facebook.com/billing_hub/accounts/details/?business_id=993604119807437&asset_id=1066070962481909&wizard_name=ADD_PM&account_type=whatsapp-business-account"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs font-black text-blue-600 hover:text-blue-800 underline pt-0.5"
              >
                <span>Add / Manage Card on Meta Business Hub ↗</span>
              </a>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[500, 1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setRechargeAmount(amt)}
                  className={`py-3 rounded-xl border text-xs font-bold transition ${
                    rechargeAmount === amt ? 'border-brand-500 bg-emerald-50 text-emerald-800' : 'border-slate-200'
                  }`}
                >
                  ₹ {amt}
                </button>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRechargeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rechargeMutation.isPending}
                onClick={() => rechargeMutation.mutate(rechargeAmount)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
              >
                {rechargeMutation.isPending ? 'Processing...' : `Pay ₹${rechargeAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
