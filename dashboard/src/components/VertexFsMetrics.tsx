"use client";

import { useEffect, useState } from 'react';
import { Activity, Database, Zap, ArrowRightLeft } from 'lucide-react';

export default function VertexFsMetrics() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll for data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/vertex-fs');
        const json = await res.json();
        if (json.data) {
          setData(json.data);
        }
      } catch (error) {
        console.error('Error fetching Vertex FS metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // 3s polling
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="animate-pulse h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-indigo-500" />
          Vertex AI Feature Store Sync (Hybrid Lambda)
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3 text-right">Batch (14-Day)</th>
                <th className="px-4 py-3 text-right">⚡ Intraday (Today)</th>
                <th className="px-4 py-3 text-right bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">Combined Total</th>
                <th className="px-4 py-3 text-right">Combined Txs</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user, i) => {
                const totalSpend = (user.baseline_total_spend || 0) + (user.intraday_total_spend || 0);
                const totalTxs = (user.baseline_tx_count || 0) + (user.intraday_tx_count || 0);
                return (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium font-mono text-zinc-900 dark:text-zinc-100">{user.user_id}</td>
                    <td className="px-4 py-3 text-right text-zinc-500">£{user.baseline_total_spend?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">£{user.intraday_total_spend?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right bg-indigo-50/50 dark:bg-indigo-950/10 font-bold text-indigo-700 dark:text-indigo-300">
                      £{totalSpend.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">{totalTxs}</td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    No active users syncing to Feature Store right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture Node */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-start space-x-3">
            <div className="p-2 bg-zinc-200 dark:bg-zinc-700 rounded">
                <Database className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            </div>
            <div>
                <h4 className="text-sm font-medium">Batch (14D) Aggregate</h4>
                <p className="text-xs text-zinc-500 mt-1">Calculated nightly in BigQuery, synced to Vertex Feature Store Optimized endpoint for static baseline retrieval.</p>
            </div>
         </div>
         <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-start space-x-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
                <h4 className="text-sm font-medium">⚡ Intraday Running Sum</h4>
                <p className="text-xs text-emerald-600/80 mt-1">Calculated continuous stream using Dataflow triggers, updating Feature Store DirectWrite endpoint in ms.</p>
            </div>
         </div>
      </div>
    </div>
  );
}
