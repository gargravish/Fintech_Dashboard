"use client";

import { useState } from 'react';
import { Play, Square } from 'lucide-react';

export default function SimulationControl() {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleSimulation = async () => {
    setLoading(true);
    try {
      const action = isRunning ? 'stop' : 'start';
      const res = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setIsRunning(!isRunning);
      }
    } catch (error) {
      console.error('Error toggling simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
      <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Control Panel</h3>
      <button
        onClick={toggleSimulation}
        disabled={loading}
        className={`flex items-center justify-center w-full py-2 px-4 rounded-md font-medium transition-colors ${
          isRunning
            ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
        }`}
      >
        {loading ? (
          <span className="animate-pulse">Processing...</span>
        ) : isRunning ? (
          <>
            <Square className="w-4 h-4 mr-2 fill-current" />
            Stop Simulation
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2 fill-current" />
            Start Simulation
          </>
        )}
      </button>
      <div className="mt-4 text-xs text-zinc-500">
        Status: <span className={isRunning ? 'text-emerald-500 font-bold' : 'text-zinc-400'}>
          {isRunning ? 'RUNNING' : 'STOPPED'}
        </span>
      </div>
    </div>
  );
}
