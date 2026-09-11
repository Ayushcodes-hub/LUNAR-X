import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Database, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';
import type { SampleDatasetItem, SyntheticPairRequest } from '../types/api';

export const DatasetExplorer: React.FC = () => {
  const setRefImage = useStore((s) => s.setRefImage);
  const setTgtImage = useStore((s) => s.setTgtImage);
  const setCurrentPage = useStore((s) => s.setCurrentPage);

  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'samples' | 'generator'>('samples');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom synthetic generator parameters
  const [genParams, setGenParams] = useState<SyntheticPairRequest>({
    width: 512,
    height: 512,
    rotation_deg: 4.5,
    scale: 1.04,
    tx: 18.5,
    ty: -12.3,
    gamma: 1.35,
    seed: 42,
  });

  const { data: samples, isLoading } = useQuery({
    queryKey: ['sampleDatasets'],
    queryFn: api.getSampleDatasets,
  });

  const handleLoadSample = (sample: SampleDatasetItem) => {
    // Construct ImageMeta from sample IDs
    setRefImage({
      image_id: sample.reference_id,
      filename: `${sample.id}_ref.png`,
      path: `uploads/${sample.reference_id}.png`,
      width: 512,
      height: 512,
      file_size_bytes: 262144,
      sha256: 'sample-sha256',
      is_synthetic: sample.mission_pair.includes('SYNTHETIC'),
      mission: sample.mission_pair,
      instrument: sample.sensor_pair,
      resolution_m_per_px: 1.0,
    });

    setTgtImage({
      image_id: sample.target_id,
      filename: `${sample.id}_tgt.png`,
      path: `uploads/${sample.target_id}.png`,
      width: 512,
      height: 512,
      file_size_bytes: 262144,
      sha256: 'sample-sha256',
      is_synthetic: sample.mission_pair.includes('SYNTHETIC'),
      mission: sample.mission_pair,
      instrument: sample.sensor_pair,
      resolution_m_per_px: 1.05,
    });

    setSuccessMsg(`Loaded "${sample.name}" into registration stage.`);
    setTimeout(() => {
      setSuccessMsg(null);
      setCurrentPage('registration');
    }, 1200);
  };

  const handleGenerateSynthetic = async () => {
    setGenerating(true);
    setSuccessMsg(null);
    try {
      const res = await api.createSyntheticPair(genParams);
      setRefImage(res.reference);
      setTgtImage(res.target);
      setSuccessMsg('Synthetic lunar pair generated & loaded with ground-truth transform.');
      setTimeout(() => {
        setSuccessMsg(null);
        setCurrentPage('registration');
      }, 1400);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 pt-20">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-cyan-900/30">
        <div>
          <div className="flex items-center gap-2">
            <Database className="text-cyan-400" size={20} />
            <h1 className="text-lg font-semibold tracking-widest text-cyan-400">
              LUNAR DATASET UNIVERSE
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browse authentic Chandrayaan-2 and LRO lunar pairs, or generate calibrated synthetic benchmarks.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-lg bg-black/40 border border-cyan-900/30">
          <button
            onClick={() => setActiveTab('samples')}
            className="px-4 py-1.5 rounded text-xs font-mono tracking-wider transition-all"
            style={{
              background: activeTab === 'samples' ? 'rgba(34,211,238,0.15)' : 'transparent',
              color: activeTab === 'samples' ? '#22d3ee' : '#64748b',
              border: activeTab === 'samples' ? '1px solid rgba(34,211,238,0.4)' : '1px solid transparent',
            }}
          >
            MISSION SAMPLES
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className="px-4 py-1.5 rounded text-xs font-mono tracking-wider transition-all"
            style={{
              background: activeTab === 'generator' ? 'rgba(34,211,238,0.15)' : 'transparent',
              color: activeTab === 'generator' ? '#22d3ee' : '#64748b',
              border: activeTab === 'generator' ? '1px solid rgba(34,211,238,0.4)' : '1px solid transparent',
            }}
          >
            SYNTHETIC BENCH GENERATOR
          </button>
        </div>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg border border-green-500/40 bg-green-500/10 text-green-400 text-xs font-mono flex items-center gap-2"
        >
          <CheckCircle2 size={16} />
          {successMsg}
        </motion.div>
      )}

      {/* SAMPLES TAB */}
      {activeTab === 'samples' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && (
            <div className="col-span-3 text-center py-12 text-slate-500 font-mono text-xs">
              Loading lunar datasets from repository...
            </div>
          )}

          {samples?.map((sample) => (
            <motion.div
              key={sample.id}
              whileHover={{ y: -4, borderColor: 'rgba(34,211,238,0.5)' }}
              className="glass p-5 rounded-xl border border-cyan-900/30 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                    {sample.mission_pair}
                  </span>
                  {sample.ground_truth ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                      GROUND TRUTH INCLUDED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700/40">
                      ORBITAL METADATA
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-slate-200 mb-2">{sample.name}</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">{sample.description}</p>

                {/* Thumbnails preview */}
                <div className="grid grid-cols-2 gap-2 mb-4 bg-black/40 p-2 rounded-lg border border-cyan-950/40">
                  <div className="text-center">
                    <img
                      src={api.getThumbnailUrl(sample.reference_id, 256)}
                      alt="Ref Preview"
                      className="w-full h-24 object-cover rounded border border-cyan-900/30"
                    />
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">REFERENCE</span>
                  </div>
                  <div className="text-center">
                    <img
                      src={api.getThumbnailUrl(sample.target_id, 256)}
                      alt="Tgt Preview"
                      className="w-full h-24 object-cover rounded border border-cyan-900/30"
                    />
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">TARGET</span>
                  </div>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-4 text-slate-400 border-t border-cyan-950/40 pt-3">
                  <div>
                    <span className="text-slate-600 block text-[9px]">SENSORS</span>
                    <span className="text-slate-300">{sample.sensor_pair}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[9px]">REGION</span>
                    <span className="text-slate-300">{sample.target_region}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[9px]">RESOLUTION</span>
                    <span className="text-slate-300">{sample.resolution}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[9px]">SUN ANGLE DELTA</span>
                    <span className="text-cyan-400">{sample.illumination_delta}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleLoadSample(sample)}
                className="w-full py-2.5 rounded-lg text-xs font-mono font-semibold tracking-wider flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'rgba(34,211,238,0.1)',
                  border: '1px solid rgba(34,211,238,0.3)',
                  color: '#22d3ee',
                }}
              >
                LOAD INTO WORKSPACE
                <ArrowRight size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* GENERATOR TAB */}
      {activeTab === 'generator' && (
        <div className="glass p-6 rounded-xl border border-cyan-900/30 max-w-2xl mx-auto space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-cyan-900/30">
            <Sparkles className="text-cyan-400" size={18} />
            <h2 className="text-sm font-semibold tracking-wider text-cyan-300">
              SYNTHETIC LUNAR PAIR GENERATOR
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Generates procedural multi-octave lunar terrain with simulated craters, continuous sub-pixel transformation, and sun elevation gamma shifts. The ground-truth transform is saved alongside the images to strictly verify registration precision.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">ROTATION (°)</label>
              <input
                type="number"
                step="0.1"
                value={genParams.rotation_deg}
                onChange={(e) => setGenParams({ ...genParams, rotation_deg: parseFloat(e.target.value) || 0 })}
                className="w-full bg-black/50 border border-cyan-900/40 rounded px-3 py-1.5 text-xs text-cyan-300 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">SCALE RATIO</label>
              <input
                type="number"
                step="0.01"
                value={genParams.scale}
                onChange={(e) => setGenParams({ ...genParams, scale: parseFloat(e.target.value) || 1 })}
                className="w-full bg-black/50 border border-cyan-900/40 rounded px-3 py-1.5 text-xs text-cyan-300 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">TRANSLATION X (px)</label>
              <input
                type="number"
                step="0.1"
                value={genParams.tx}
                onChange={(e) => setGenParams({ ...genParams, tx: parseFloat(e.target.value) || 0 })}
                className="w-full bg-black/50 border border-cyan-900/40 rounded px-3 py-1.5 text-xs text-cyan-300 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">TRANSLATION Y (px)</label>
              <input
                type="number"
                step="0.1"
                value={genParams.ty}
                onChange={(e) => setGenParams({ ...genParams, ty: parseFloat(e.target.value) || 0 })}
                className="w-full bg-black/50 border border-cyan-900/40 rounded px-3 py-1.5 text-xs text-cyan-300 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">RELIGHTING GAMMA (Sun angle)</label>
              <input
                type="number"
                step="0.05"
                value={genParams.gamma}
                onChange={(e) => setGenParams({ ...genParams, gamma: parseFloat(e.target.value) || 1 })}
                className="w-full bg-black/50 border border-cyan-900/40 rounded px-3 py-1.5 text-xs text-cyan-300 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">RNG SEED</label>
              <input
                type="number"
                value={genParams.seed}
                onChange={(e) => setGenParams({ ...genParams, seed: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-black/50 border border-cyan-900/40 rounded px-3 py-1.5 text-xs text-cyan-300 font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateSynthetic}
            disabled={generating}
            className="w-full py-3 rounded-lg text-xs font-mono font-semibold tracking-widest text-cyan-300 transition-all flex items-center justify-center gap-2 mt-4"
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(6,182,212,0.15))',
              border: '1px solid rgba(34,211,238,0.5)',
              boxShadow: '0 0 20px rgba(34,211,238,0.2)',
            }}
          >
            {generating ? 'GENERATING SYNTHETIC PAIR...' : 'GENERATE & LOAD INTO STAGE'}
          </button>
        </div>
      )}
    </div>
  );
};
