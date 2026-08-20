import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { 
  Building2, 
  ChevronDown, 
  Wallet, 
  Plus, 
  Search, 
  Instagram, 
  Calendar, 
  Bell, 
  LogOut, 
  User, 
  Settings,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Topbar({ dashboardData }) {
  const { user, organizations, activeOrganization, setActiveOrganization, logout } = useAuthStore();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const walletBalance = dashboardData?.wallet?.balance !== undefined ? dashboardData.wallet.balance : 517.65;
  const messagesUsed = dashboardData?.plan?.messagesUsed || 13;
  const messagesLimit = dashboardData?.plan?.monthlyLimit || 2000;
  const orgName = activeOrganization?.name || dashboardData?.accountProfile?.name || 'Arvee Appliances';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left: Brand Logo & Org Selector */}
      <div className="flex items-center space-x-4 md:space-x-6">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654z"/>
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-800 hidden sm:inline">
            Wapp<span className="text-brand-600">bíz</span>
          </span>
        </Link>

        {/* Organization Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
            className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-all text-xs font-semibold text-slate-700"
          >
            <div className="w-5 h-5 rounded bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
              {orgName.charAt(0)}
            </div>
            <span className="max-w-[120px] md:max-w-[160px] truncate">{orgName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showOrgDropdown && (
            <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Workspace
              </div>
              {organizations?.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setActiveOrganization(org);
                    setShowOrgDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="font-medium truncate">{org.name}</span>
                  {org.id === activeOrganization?.id && (
                    <span className="text-[10px] bg-brand-50 text-brand-600 font-bold px-1.5 py-0.5 rounded">Active</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Quota indicator, Wallet Balance, Action icons & Profile */}
      <div className="flex items-center space-x-3 md:space-x-4">
        {/* Messages Quota Meter */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
          <span className="text-slate-500">Messages:</span>
          <span className="font-bold text-slate-900">{messagesUsed} / {messagesLimit}</span>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-1">
            <div 
              className="h-full bg-brand-500 rounded-full transition-all" 
              style={{ width: `${Math.min(100, (messagesUsed / messagesLimit) * 100)}%` }} 
            />
          </div>
        </div>

        {/* Wallet Balance Badge */}
        <Link
          to="/billing"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-all text-xs font-bold shadow-sm"
        >
          <span>₹ {Number(walletBalance).toFixed(2)}</span>
          <Plus className="w-3.5 h-3.5 text-emerald-700" />
        </Link>

        {/* Utility Icon Buttons */}
        <div className="flex items-center space-x-1 text-slate-500">
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition" title="Search (Cmd+K)">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 text-pink-600 transition hidden sm:flex" title="Instagram Connected">
            <Instagram className="w-4 h-4" />
          </button>
          <Link to="/campaigns" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition hidden sm:flex" title="Schedules">
            <Calendar className="w-4 h-4" />
          </Link>
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition relative" title="Notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>
        </div>

        {/* User Profile Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-brand-100 hover:ring-brand-300 transition"
          >
            {user?.name?.charAt(0) || 'W'}
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Wasim Ansari'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || 'wasim@arvee.com'}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setShowUserDropdown(false)}
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Account Settings</span>
              </Link>
              <Link
                to="/billing"
                onClick={() => setShowUserDropdown(false)}
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Wallet className="w-4 h-4 text-slate-400" />
                <span>Billing & Wallet</span>
              </Link>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={logout}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
