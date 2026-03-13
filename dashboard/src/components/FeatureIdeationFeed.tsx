"use client";

import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function FeatureIdeationFeed() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        const res = await fetch('/api/ideation');
        const json = await res.json();
        if (json.data) {
          setIdeas(json.data);
        }
      } catch (error) {
        console.error('Error fetching ideas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIdeas();
  }, []);

  if (loading) return <div className="animate-pulse h-64 bg-zinc-100 rounded-lg"></div>;

  return (
    <div className="space-y-6">
      {ideas.map((idea, i) => (
        <div key={i} className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-700">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
              Ideation for: <span className="font-mono text-indigo-600 dark:text-indigo-400">{idea.source_table}</span>
            </h3>
            <span className="text-xs text-zinc-400 ml-auto">
              {new Date(idea.generated_at.value).toLocaleString()}
            </span>
          </div>
          
          <div className="text-zinc-700 dark:text-zinc-300">
             <div className="prose prose-sm dark:prose-invert max-w-none">
               <ReactMarkdown 
                  components={{
                    h1: ({node, ...props}) => <h3 className="font-bold text-lg mb-2 mt-4 first:mt-0" {...props} />,
                    h2: ({node, ...props}) => <h4 className="font-bold text-md mb-2 mt-3" {...props} />,
                    h3: ({node, ...props}) => <h5 className="font-bold text-sm mb-1 uppercase tracking-wide text-zinc-500 mt-2" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mb-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 mb-2" {...props} />,
                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    strong: ({node, ...props}) => <span className="font-semibold text-indigo-700 dark:text-indigo-400" {...props} />,
                    code: ({node, ...props}) => <code className="bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded font-mono text-xs text-pink-600 dark:text-pink-400" {...props} />,
                    pre: ({node, ...props}) => <pre className="bg-zinc-900 text-zinc-100 p-3 rounded-md overflow-x-auto text-xs font-mono my-2" {...props} />,
                  }}
                >
                  {idea.new_feature_ideas}
                </ReactMarkdown>
             </div>
          </div>
        </div>
      ))}
       {ideas.length === 0 && (
        <div className="text-center py-12 text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
          <p>No feature ideas generated yet.</p>
          <p className="text-sm mt-1">Run the pipeline to generate insights.</p>
        </div>
      )}
    </div>
  );
}
