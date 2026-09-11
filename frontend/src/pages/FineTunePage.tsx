import React, { useState } from 'react';
import { Cpu, Play, CheckCircle2, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StepRecord {
  step: number;
  epoch: number;
  loss: number;
  lr: number;
  time_elapsed_sec: number;
}

export const FineTunePage: React.FC = () => {
  const [epochs, setEpochs] = useState<number>(3);
  const [learningRate, setLearningRate] = useState<number>(0.001);
  const [training, setTraining] = useState<boolean>(false);
  const [history, setHistory] = useState<StepRecord[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTraining = async () => {
    setTraining(true);
    setError(null);
    setResult(null);
    setHistory([]);

    try {
      const res = await fetch('/api/v1/mlops/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epochs: epochs,
          batch_size: 4,
          learning_rate: learningRate,
          use_sample_dem: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Training failed');
      }

      const data = await res.json();
      setResult(data);
      if (data.step_history) {
        setHistory(data.step_history);
      }
    } catch (e: any) {
      setError(e.message || 'Training connection error');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="relative w-full h-full pt-20 pb-8 px-8 overflow-y-auto max-w-6xl mx-auto space-y-6">
      <div className="border-b border-cyan-900/30 pb-4">
        <div className="flex items-center gap-3">
          <Cpu className="text-cyan-400" size={24} />
          <h1 className="text-xl font-bold tracking-widest text-cyan-400">PHYSICAL PHOTOMETRIC FINE-TUNING BENCH</h1>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Executes real PyTorch gradient descent on physically relighted DEM tiles for self-supervised sun-angle domain adaptation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Hyperparameters Control */}
        <div className="glass p-5 rounded-xl border border-cyan-900/30 space-y-4">
          <div className="text-xs font-bold text-slate-200 font-mono tracking-wider border-b border-cyan-900/30 pb-2">
            TRAINING HYPERPARAMETERS
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Epochs:</span>
              <span className="text-cyan-300 font-bold">{epochs}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={epochs}
              onChange={(e) => setEpochs(Number(e.target.value))}
              disabled={training}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Learning Rate:</span>
              <span className="text-cyan-300 font-bold">{learningRate}</span>
            </div>
            <select
              value={learningRate}
              onChange={(e) => setLearningRate(Number(e.target.value))}
              disabled={training}
              className="w-full bg-black/50 border border-cyan-900/40 rounded px-2 py-1 text-slate-300"
            >
              <option value={0.001}>1e-3 (Standard AdamW)</option>
              <option value={0.0005}>5e-4 (Fine)</option>
              <option value={0.0001}>1e-4 (Conservative)</option>
            </select>
          </div>

          <div className="p-3 rounded bg-black/40 border border-cyan-900/30 font-mono text-[11px] text-slate-400 space-y-1">
            <div className="text-cyan-400 font-bold">Domain Adaptation Mode</div>
            <div>• Physical Lambertian/Hapke Relighting</div>
            <div>• DINOv2 Token Feature Alignment</div>
            <div>• Symmetric InfoNCE Contrastive Loss</div>
          </div>

          <button
            onClick={startTraining}
            disabled={training}
            className={`w-full py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-all ${
              training
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 cursor-wait'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 hover:bg-cyan-500/30'
            }`}
          >
            {training ? (
              <>
                <Activity size={14} className="animate-spin text-cyan-400" />
                <span>TRAINING IN PROGRESS…</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>START PYTORCH TRAINING</span>
              </>
            )}
          </button>

          {error && <div className="text-xs font-mono text-red-400">{error}</div>}
        </div>

        {/* Right: Live Training Loss Curve */}
        <div className="lg:col-span-2 glass p-5 rounded-xl border border-cyan-900/30 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-200 font-mono tracking-wider">
                CONTRASTIVE LOSS TRAJECTORY
              </span>
              {training && (
                <span className="text-[11px] font-mono text-cyan-400 animate-pulse flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>LIVE PYTORCH LOOP</span>
                </span>
              )}
            </div>

            <div className="h-64 w-full">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="step" tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'Step', position: 'insideBottom', fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0b14', borderColor: '#22d3ee', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="loss" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-mono text-slate-600">
                  Loss curve will plot live when training is initiated
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="mt-4 p-3 rounded bg-black/50 border border-green-500/30 text-xs font-mono flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 size={16} />
                <span>Training Completed in {result.wall_clock_time_sec}s</span>
              </div>
              <div className="text-slate-300">
                Initial: <strong className="text-cyan-300">{result.initial_loss}</strong> ➔ Final: <strong className="text-green-300">{result.final_loss}</strong> (Val: {result.validation_loss})
              </div>
              <div className="text-[11px] text-cyan-400 font-bold">
                {result.evaluation_gate_passed ? '✓ EVALUATION GATE PASSED — PROMOTED TO STAGING' : '✗ EVALUATION GATE FAILED'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
