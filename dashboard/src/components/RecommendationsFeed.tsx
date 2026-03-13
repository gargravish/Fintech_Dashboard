"use client";

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Recommendation {
  user_id: string;
  recommendation: string;
  generated_at: { value: string };
  riskLevel?: 'High' | 'Medium' | 'Low';
}

export default function RecommendationsFeed() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await fetch('/api/recommendations');
        const json = await res.json();
        if (json.data) {
          const processed = json.data.map((rec: any) => {
            // Simple logic to extract risk level from text if present
            let risk: Recommendation['riskLevel'] = 'Low';
            const text = rec.recommendation || '';
            if (text.includes('Risk Assessment: High') || text.includes('High Risk')) risk = 'High';
            else if (text.includes('Risk Assessment: Medium') || text.includes('Medium Risk')) risk = 'Medium';
            
            return { ...rec, riskLevel: risk };
          });
          setRecommendations(processed);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecs();
    const interval = setInterval(fetchRecs, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="animate-pulse h-64 bg-zinc-100 rounded-lg"></div>;

  return (
    <div className="space-y-4">
      {recommendations.map((rec, i) => (
        <div key={i} className={`p-4 rounded-lg border flex items-start space-x-4 ${
          rec.riskLevel === 'High' 
            ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' 
            : rec.riskLevel === 'Medium'
            ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'
            : 'bg-white border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700'
        }`}>
          <div className="flex-shrink-0 mt-1">
            {rec.riskLevel === 'High' && <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />}
            {rec.riskLevel === 'Medium' && <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
            {rec.riskLevel === 'Low' && <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold text-sm font-mono text-zinc-900 dark:text-zinc-100">
                User: {rec.user_id}
              </h4>
              <span className="text-xs text-zinc-500">
                {new Date(rec.generated_at.value).toLocaleTimeString()}
              </span>
            </div>
            <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown 
                  components={{
                    h1: ({node, ...props}) => <h3 className="font-bold text-lg mb-2" {...props} />,
                    h2: ({node, ...props}) => <h4 className="font-bold text-md mb-2" {...props} />,
                    h3: ({node, ...props}) => <h5 className="font-bold text-sm mb-1 uppercase tracking-wide text-zinc-500" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mb-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 mb-2" {...props} />,
                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    strong: ({node, ...props}) => <span className="font-semibold text-indigo-700 dark:text-indigo-400" {...props} />,
                  }}
                >
                  {rec.recommendation}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      ))}
      {recommendations.length === 0 && (
        <div className="text-center py-8 text-zinc-400">No recommendations available yet.</div>
      )}
    </div>
  );
}
