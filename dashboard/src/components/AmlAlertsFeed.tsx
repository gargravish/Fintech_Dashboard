"use client";

import { useEffect, useState } from 'react';
import { ShieldAlert, AlertCircle, AlertOctagon, Database } from 'lucide-react';

interface AmlAlert {
  transaction_id: string;
  user_id: string;
  alert_type: string;
  amount: number;
  timestamp: { value: string };
  stats?: {
     baseline_tx_count: number;
     baseline_total_spend: number;
     intraday_tx_count: number;
     intraday_total_spend: number;
  }
}

export default function AmlAlertsFeed() {
  const [alerts, setAlerts] = useState<AmlAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/aml-alerts');
        const json = await res.json();
        if (json.data) {
          setAlerts(json.data);
        }
      } catch (error) {
        console.error('Error fetching AML alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="animate-pulse h-64 bg-zinc-100 dark:bg-zinc-800 rounded-lg"></div>;

  return (
    <div className="space-y-4">
      {alerts.map((alert, i) => {
        const isHighRisk = alert.amount >= 50000;
        
        return (
          <div key={i} className={`p-4 rounded-lg border flex items-start space-x-4 ${
            isHighRisk 
              ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' 
              : 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'
          }`}>
            <div className="flex-shrink-0 mt-1">
              {isHighRisk ? (
                <AlertOctagon className="w-6 h-6 text-red-600 dark:text-red-400" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-sm font-mono text-zinc-900 dark:text-zinc-100">
                    User: {alert.user_id}
                  </h4>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    Tx ID: {alert.transaction_id.substring(0, 16)}...
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-500">
                    {new Date(alert.timestamp.value).toLocaleTimeString()}
                  </span>
                  <div className={`text-sm font-bold mt-1 ${isHighRisk ? 'text-red-600' : 'text-amber-600'}`}>
                    £{alert.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  isHighRisk 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                }`}>
                  {alert.alert_type}
                </span>
                <span className="ml-2 text-xs text-zinc-500">
                  Stateless Trigger
                </span>
              </div>

              {/* Vertex AI Feature Store Breakdown */}
              {alert.stats && (
                <div className="mt-3 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <Database className="w-3.5 h-3.5 mr-1" />
14-Day Vertex AI FS Aggregate Lookup:
                  </div>
                  
                  {(() => {
                     const bSpend = alert.stats.baseline_total_spend || 0;
                     const bCount = alert.stats.baseline_tx_count || 0;
                     const iSpend = alert.stats.intraday_total_spend || 0;
                     const iCount = alert.stats.intraday_tx_count || 0;
                     
                     const totalSpend = bSpend + iSpend;
                     const totalCount = bCount + iCount;
                     const avg15d = totalCount > 0 ? totalSpend / totalCount : 0;
                     const ratio = avg15d > 0 ? alert.amount / avg15d : 0;

                     return (
                       <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                         <div>
                           <span className="text-zinc-400">15-Day Moving Avg:</span> <b className="text-zinc-900 dark:text-zinc-100">£{avg15d.toFixed(2)}</b>
                         </div>
                         <div>
                           <span className="text-zinc-400">Incoming VS Average:</span> <b className={ratio > 2 ? "text-red-500" : "text-emerald-600"}>{ratio.toFixed(1)}x</b>
                         </div>
                         <div className="col-span-2 mt-1 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded text-[10px] font-mono flex justify-between">
                            <span>Batch Sum: £{bSpend.toFixed(0)}</span>
                            <span className="text-zinc-400">+</span>
                            <span>Live Intraday: £{iSpend.toFixed(0)}</span>
                         </div>
                       </div>
                     );
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {alerts.length === 0 && (
        <div className="text-center py-8 text-zinc-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
          <p>No real-time Continuous Query alerts active.</p>
        </div>
      )}
    </div>
  );
}
