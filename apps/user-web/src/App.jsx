import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import InboxPage from './pages/InboxPage';
import ContactsPage from './pages/ContactsPage';
import LeadsPage from './pages/LeadsPage';
import CampaignsPage from './pages/CampaignsPage';
import TemplatesPage from './pages/TemplatesPage';
import BillingPage from './pages/BillingPage';
import AutomationPage from './pages/AutomationPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuthStore } from './stores/authStore';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="automation" element={<AutomationPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
