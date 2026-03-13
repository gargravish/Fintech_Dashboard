"use client";

import { useState } from 'react';
import RealTimeMetrics from '@/components/RealTimeMetrics';
import SimulationControl from '@/components/SimulationControl';
import RecommendationsFeed from '@/components/RecommendationsFeed';
import FeatureIdeationFeed from '@/components/FeatureIdeationFeed';
import AmlAlertsFeed from '@/components/AmlAlertsFeed';
import VertexFsMetrics from '@/components/VertexFsMetrics';
import { Sparkles, Zap, LayoutDashboard, Lightbulb, ShieldAlert, Database } from 'lucide-react';
import clsx from 'clsx';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'ideation' | 'aml' | 'vertexfs'>('recommendations');

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400">
              Fin<span className="text-indigo-600">Tech</span> Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-500">
              v1.0.0
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Feed */}
          <div className="lg:col-span-3 space-y-8">
            <section className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <LayoutDashboard className="w-5 h-5 mr-2 text-indigo-500" />
                Real-Time Velocity (15m Window)
              </h2>
              <RealTimeMetrics />
            </section>
            
            <section className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
               <div className="flex items-center justify-between mb-6">
                 <h2 className="text-lg font-semibold flex items-center">
                   <Sparkles className="w-5 h-5 mr-2 text-amber-500" />
                   AI Insights
                 </h2>
                 
                 <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                   <button
                     onClick={() => setActiveTab('recommendations')}
                     className={clsx(
                       "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                       activeTab === 'recommendations' 
                         ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" 
                         : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                     )}
                   >
                     Recommendations
                   </button>
                   <button
                     onClick={() => setActiveTab('ideation')}
                     className={clsx(
                       "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                       activeTab === 'ideation' 
                         ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" 
                         : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                     )}
                   >
                     Feature Ideation
                   </button>
                   <button
                     onClick={() => setActiveTab('vertexfs')}
                     className={clsx(
                       "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center",
                       activeTab === 'vertexfs' 
                         ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                         : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                     )}
                   >
                     <Database className="w-4 h-4 mr-1 text-indigo-500" />
                     Vertex FS
                   </button>
                   <button
                     onClick={() => setActiveTab('aml')}
                     className={clsx(
                       "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center",
                       activeTab === 'aml' 
                         ? "bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-sm" 
                         : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                     )}
                   >
                     <ShieldAlert className="w-4 h-4 mr-1 text-red-500" />
                     AML Alerts
                   </button>
                 </div>
               </div>
               
               <div className="min-h-[400px]">
                 {activeTab === 'recommendations' && <RecommendationsFeed />}
                 {activeTab === 'ideation' && <FeatureIdeationFeed />}
                 {activeTab === 'vertexfs' && <VertexFsMetrics />}
                 {activeTab === 'aml' && <AmlAlertsFeed />}
               </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <SimulationControl />
            
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-zinc-500">System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Pub/Sub Stream</span>
                  <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                    ACTIVE
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Dataflow Pipeline</span>
                  <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                    RUNNING
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">BigQuery ML</span>
                  <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                    CONNECTED
                  </span>
                </div>
              </div>
            </div>
            
             <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                <h3 className="font-bold text-lg mb-2 relative z-10">FinTech</h3>
                <p className="text-indigo-100 text-sm mb-4 relative z-10">
                  Advanced Financial Engineering powered by Google Gemini.
                </p>
                <div className="text-xs font-mono bg-black/20 rounded p-2 relative z-10">
                  Project: {process.env.NEXT_PUBLIC_GCP_PROJECT_ID || 'Demo'}
                </div>
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}
