"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, CreditCard, TrendingUp, Users } from 'lucide-react';

export default function RealTimeMetrics() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll for data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/metrics');
        const json = await res.json();
        if (json.data) {
          // Sort or process data if needed
          setData(json.data);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // 3s polling
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="animate-pulse h-64 bg-zinc-100 rounded-lg"></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Top Active Users Table */}
      <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-indigo-500" />
          Live Activity (Last 15m)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3 text-right">Tx Count</th>
                <th className="px-4 py-3 text-right">Total Spend</th>
                <th className="px-4 py-3 text-right">Max Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium font-mono text-zinc-900 dark:text-zinc-100">{user.user_id}</td>
                  <td className="px-4 py-3 text-right">{user.tx_count}</td>
                  <td className="px-4 py-3 text-right">£{user.total_spend?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">£{user.max_amount?.toFixed(2)}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                    No active users in the last 15 minutes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Cards (Aggregates would be better, but we'll use list length for now or max) */}
      <div className="space-y-6">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Top Spender</h4>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {data.length > 0 ? `£${Math.max(...data.map(d => d.total_spend || 0)).toFixed(0)}` : '£0'}
          </div>
          <div className="text-xs text-indigo-600/70 mt-1">Highest 15m volume</div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-lg border border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Active Users</h4>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {data.length}
          </div>
          <div className="text-xs text-emerald-600/70 mt-1">Visible in current window</div>
        </div>
      </div>
    </div>
  );
}
