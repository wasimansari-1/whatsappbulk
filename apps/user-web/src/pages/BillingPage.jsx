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
        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-3xl p-6 shadow-xl shadow-emerald-700/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Prepaid Wallet</span>
            </div>
            <button
              onClick={() => setIsRechargeModalOpen(true)}
              className="px-3 py-1.5 bg-white text-emerald-800 rounded-xl text-xs font-black hover:bg-emerald-50 transition shadow-sm flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Credits</span>
            </button>
          </div>

          <div className="my-4">
            <p className="text-3xl font-black">₹ {Number(overview.wallet.balance).toFixed(2)}</p>
            <p className="text-xs text-emerald-100 mt-1">
              Available for broadcast campaigns (~{(overview.wallet.balance / 0.40).toFixed(0)} messages)
            </p>
          </div>

          <div className="pt-3 border-t border-emerald-500/50 flex justify-between text-xs text-emerald-100">
            <span>Used Credits:</span>
            <span className="font-bold text-white">₹ {Number(overview.wallet.usedCredits).toFixed(2)}</span>
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
