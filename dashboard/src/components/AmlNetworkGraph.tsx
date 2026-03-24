"use client";

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Network, AlertTriangle, ShieldCheck } from 'lucide-react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function AmlNetworkGraph() {
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[], anomalies?: any[] }>({ nodes: [], links: [] });
  const [inference, setInference] = useState({ heading: "Scanning structural topologies...", summary: "Running GQL matrix matchers in BigQuery Graph engine." });
  const [loading, setLoading] = useState(true);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any | null>(null);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/aml-graph')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
           setGraphData({ nodes: json.data.nodes, links: json.data.links, anomalies: json.data.anomalies });
           setInference(json.data.inference);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative w-full h-[600px] bg-black rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner">
      {/* Glossy Overlay for Context/Inference */}
      <div className={`absolute top-4 left-4 z-10 ${selectedAnomaly ? 'w-[650px] max-w-full' : 'w-96'} p-5 backdrop-blur-xl bg-black/70 border border-white/10 rounded-xl shadow-2xl transition-all duration-300`}>
         <div className="flex items-center justify-between mb-2">
           <div className="flex items-center space-x-2 text-red-500">
              {graphData.nodes.length > 0 ? (
                 <Network className="w-5 h-5 animate-pulse" />
              ) : (
                 <ShieldCheck className="w-5 h-5 text-emerald-500" />
              )}
              <h3 className="font-bold tracking-tight uppercase text-sm">
                {selectedAnomaly ? 'Anomaly Details' : 'Topological Alerts'}
              </h3>
           </div>
           {selectedAnomaly && (
               <button onClick={() => setSelectedAnomaly(null)} className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white font-medium transition border border-white/20">
                 Back to Global
               </button>
           )}
         </div>
         
         {loading ? (
             <div className="animate-pulse space-y-3 mt-4">
                 <div className="h-5 bg-white/20 rounded w-3/4"></div>
                 <div className="h-4 bg-white/20 rounded w-full"></div>
                 <div className="h-4 bg-white/20 rounded w-5/6"></div>
             </div>
         ) : selectedAnomaly ? (
             <div className="mt-4 animate-in fade-in slide-in-from-left-4 duration-500">
                 <div className="inline-block px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold mb-3 uppercase tracking-wider">
                    {selectedAnomaly.type}
                 </div>
                 <h2 className="text-2xl font-bold leading-tight mb-2 text-white">
                     {selectedAnomaly.inference?.heading || selectedAnomaly.type}
                 </h2>
                 <p className="text-sm text-zinc-300 leading-relaxed font-sans mb-5">
                     {selectedAnomaly.inference?.summary}
                 </p>
                 
                 <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/50 shadow-inner">
                     <table className="w-full text-xs text-left">
                        <thead className="bg-white/5 text-zinc-400 font-mono uppercase tracking-wider">
                           <tr>
                             <th className="px-3 py-3 border-b border-white/10">Source Node</th>
                             <th className="px-3 py-3 border-b border-white/10">Target Node</th>
                             <th className="px-3 py-3 border-b border-white/10 text-right">Details</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-zinc-200">
                           {selectedAnomaly.links.map((link: any, idx: number) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                 <td className="px-3 py-3 font-medium">{link.source.id || link.source}</td>
                                 <td className="px-3 py-3 font-medium">{link.target.id || link.target}</td>
                                 <td className="px-3 py-3 text-red-400 font-mono text-right">{link.label || `$${link.amount?.toLocaleString()}`}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                 </div>
             </div>
         ) : (
             <>
                 <h2 className={`text-xl font-bold leading-tight mb-2 ${graphData.nodes.length > 0 ? 'text-white' : 'text-emerald-400'}`}>
                     {inference.heading}
                 </h2>
                 <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                     {inference.summary}
                 </p>
                 <div className="mt-4 pt-4 border-t border-white/10 text-[10px] font-mono uppercase tracking-widest text-zinc-500 flex justify-between items-center">
                     <span>BigQuery Graph • GQL</span>
                     <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded">{inference.heading?.includes('GQL:') ? 'Deterministic' : 'Gemini'}</span>
                 </div>
             </>
         )}
      </div>

      {/* ForceGraph Container */}
      <div className="w-full h-full opacity-90 overflow-hidden cursor-crosshair">
          {!loading && <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeAutoColorBy="group"
            nodeRelSize={6}
            linkColor={() => "rgba(255, 60, 60, 0.4)"}
            linkWidth={link => Math.min(Math.max((link as any).amount / 1000, 1), 6)}
            linkDirectionalParticles={5}
            linkDirectionalParticleSpeed={0.015}
            linkDirectionalParticleWidth={2.5}
            backgroundColor="#000000"
            onNodeClick={(node) => {
               if (graphData.anomalies) {
                  const anomaly = graphData.anomalies.find(a => a.nodes.some((n: any) => n.id === node.id));
                  if (anomaly) setSelectedAnomaly(anomaly);
               }
            }}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.id;
              const fontSize = 12/globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); 

              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = node.color || '#fff';
              ctx.fillText(label, node.x, node.y);

              node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
            }}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              ctx.fillStyle = color;
              const bckgDimensions = node.__bckgDimensions;
              bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
            }}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link: any, ctx) => {
              const start = link.source;
              const end = link.target;
              // Ignore links if coordinates are not fully resolved
              if (typeof start !== 'object' || typeof end !== 'object') return;
              
              const textPos = Object.assign(...['x', 'y'].map(c => ({
                [c]: start[c] + (end[c] - start[c]) / 2 // calc middle point
              })));
              
              const relLink = { x: end.x - start.x, y: end.y - start.y };
              
              let textAngle = Math.atan2(relLink.y, relLink.x);
              if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
              if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);
              
              const label = link.label;
              if (!label) return;
              
              ctx.font = '3px Sans-Serif';
              ctx.save();
              ctx.translate(textPos.x, textPos.y);
              ctx.rotate(textAngle);
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.fillText(label, 0, 0);
              ctx.restore();
            }}
            onEngineStop={() => {
                if (fgRef.current && graphData.nodes.length > 0) {
                    fgRef.current.zoomToFit(400, 50);
                }
            }}
          />}
      </div>
    </div>
  );
}
