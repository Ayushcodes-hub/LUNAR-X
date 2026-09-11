import React, { useEffect, useState } from 'react';
import { HardDrive, ShieldCheck, ShieldAlert, ArrowUpRight, RotateCcw } from 'lucide-react';

interface ModelItem {
  model_id: string;
  name: string;
  architecture: string;
  stage: 'development' | 'staging' | 'production';
  created_at: string;
  validation_metrics: Record<string, any>;
  evaluation_gate_passed: boolean;
  promoted_by?: string;
  promotion_notes?: string;
}

export const ModelRegistryPage: React.FC = () => {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/mlops/models');
      const data = await res.json();
      setModels(data);
    } catch (e) {
      console.error('Failed to load model registry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handlePromote = async (modelId: string, targetStage: 'staging' | 'production') => {
    setPromoting(modelId);
    try {
      const res = await fetch(`/api/v1/mlops/models/${modelId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_stage: targetStage, user: 'isro_analyst' }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Promotion rejected by evaluation gate');
      } else {
        await fetchModels();
      }
    } catch (e) {
      alert('Promotion network error');
    } finally {
      setPromoting(null);
    }
  };

  return (
    <div className="relative w-full h-full pt-20 pb-8 px-8 overflow-y-auto max-w-6xl mx-auto space-y-6">
      <div className="border-b border-cyan-900/30 pb-4">
        <div className="flex items-center gap-3">
          <HardDrive className="text-cyan-400" size={24} />
          <h1 className="text-xl font-bold tracking-widest text-cyan-400">MLOPS MODEL REGISTRY & STAGING GATES</h1>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Pinned foundation checkpoints, fine-tuned projection heads, and evaluation-gated production promotions.
        </p>
      </div>

      {loading ? (
        <div className="text-xs text-slate-500 font-mono py-12 text-center">Loading model registry ledger…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {models.map((m) => {
            const isProd = m.stage === 'production';
            const isStaging = m.stage === 'staging';

            return (
              <div
                key={m.model_id}
                className="glass p-5 rounded-xl border border-cyan-900/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-200">{m.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase ${
                        isProd
                          ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                          : isStaging
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {m.stage}
                    </span>
                    {m.evaluation_gate_passed ? (
                      <span className="flex items-center gap-1 text-[11px] text-green-400 font-mono">
                        <ShieldCheck size={13} />
                        <span>GATE PASSED</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-red-400 font-mono">
                        <ShieldAlert size={13} />
                        <span>GATE FAILED</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono text-slate-400">
                    ID: <span className="text-slate-300">{m.model_id}</span> · Arch: <span className="text-cyan-300">{m.architecture}</span>
                  </div>

                  {m.promotion_notes && (
                    <div className="text-xs font-mono text-slate-500">{m.promotion_notes}</div>
                  )}

                  {/* Validation Metrics Scorecard */}
                  <div className="flex flex-wrap gap-3 pt-2 text-xs font-mono text-slate-400">
                    {Object.entries(m.validation_metrics || {}).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-black/40 border border-cyan-900/20">
                        {k.replace('_', ' ')}: <strong className="text-cyan-300">{typeof v === 'number' ? v.toFixed(3) : String(v)}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Staging Promotion Controls */}
                <div className="flex items-center gap-2">
                  {!isProd && (
                    <button
                      onClick={() => handlePromote(m.model_id, 'production')}
                      disabled={!m.evaluation_gate_passed || promoting === m.model_id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold tracking-wider transition-colors ${
                        m.evaluation_gate_passed
                          ? 'bg-green-500/20 text-green-300 border border-green-500/50 hover:bg-green-500/30'
                          : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpRight size={14} />
                      <span>PROMOTE TO PROD</span>
                    </button>
                  )}
                  {isProd && (
                    <button
                      onClick={() => handlePromote(m.model_id, 'staging')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-slate-400 border border-cyan-900/40 hover:bg-cyan-950/40 transition-colors"
                    >
                      <RotateCcw size={13} />
                      <span>ROLLBACK</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
