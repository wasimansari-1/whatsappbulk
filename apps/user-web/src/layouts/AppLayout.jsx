import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function AppLayout() {
  const { data: dashboardRes } = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: () => api.get('/dashboard'),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const dashboardData = dashboardRes?.data || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Topbar dashboardData={dashboardData} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet context={{ dashboardData }} />
        </main>
      </div>
    </div>
  );
}
