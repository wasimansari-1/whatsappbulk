import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Filter,
  FileText,
  Megaphone,
  Bot,
  BarChart3,
  ShoppingBag,
  Share2,
  Settings,
  HelpCircle
} from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/inbox', icon: MessageSquare, label: 'Chats & Inbox' },
    { to: '/contacts', icon: Users, label: 'Customers' },
    { to: '/leads', icon: Filter, label: 'Leads CRM' },
    { to: '/templates', icon: FileText, label: 'Templates' },
    { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
    { to: '/automation', icon: Bot, label: 'Automation & Chatbot' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/billing', icon: ShoppingBag, label: 'Billing & Wallet' },
    { to: '/settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 justify-between shrink-0 z-20">
      <div className="flex flex-col items-center space-y-3 w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative group ${
                isActive
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5 stroke-[1.8]" />
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand-500 rounded-r-full" />
                )}
                {/* Floating tooltip on hover */}
                <span className="absolute left-14 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <a
          href="mailto:support@wappbiz.io"
          className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          title="Support & Docs"
        >
          <HelpCircle className="w-5 h-5" />
        </a>
      </div>
    </aside>
  );
}
