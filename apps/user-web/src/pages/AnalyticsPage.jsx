import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export default function AnalyticsPage() {
  const dailyData = [
    { day: '14 Aug', sent: 1450, delivered: 1410, read: 1120 },
    { day: '15 Aug', sent: 2890, delivered: 2790, read: 2310 },
    { day: '16 Aug', sent: 1890, delivered: 1820, read: 1450 },
    { day: '17 Aug', sent: 2390, delivered: 2300, read: 1780 },
    { day: '18 Aug', sent: 1780, delivered: 1710, read: 1320 },
    { day: '19 Aug', sent: 2190, delivered: 2110, read: 1690 },
    { day: '20 Aug', sent: 2450, delivered: 2380, read: 1840 }
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Campaign & Message Analytics</h1>
        <p className="text-xs text-slate-500 mt-0.5">Deep delivery insights, read rates, and customer engagement metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sending Volume */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Daily Message Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sent" />
                <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name="Delivered" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Read Rate Trends */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Customer Read Engagement Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="read" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="Read" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
