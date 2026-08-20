import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboardPage from './pages/AdminDashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
