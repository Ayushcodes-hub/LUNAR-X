// ControlPanel — left glass console with all pipeline parameters
// All controls wired to real params dispatched to the backend
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, Upload, Image, Sliders, Cpu, Target } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../services/api';
import type { ImageMeta } from '../types/api';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-cyan-900/30 pb-3 mb-3">
      <button
        className="flex items-center justify-between w-full py-2 text-xs tracking-widest text-slate-400 hover:text-cyan-400 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-500">{icon}</span>
          {title}
        </div>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ImageDropZone: React.FC<{
  label: string;
  image: ImageMeta | null;
  onUpload: (img: ImageMeta) => void;
}> = ({ label, image, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp'] },
    multiple: false,
    onDrop: async (files) => {
      if (!files[0]) return;
      setUploading(true);
      setError(null);
      try {
        const meta = await api.uploadImage(files[0]);
        onUpload(meta);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
  });

  return (
    <div className="mb-3">
      <div className="text-xs text-slate-500 mb-1 tracking-wider">{label}</div>
      <div
        {...getRootProps()}
        className="rounded-lg border border-dashed cursor-pointer transition-all p-3 text-center"
        style={{
          borderColor: isDragActive ? '#22d3ee' : 'rgba(34,211,238,0.2)',
          background: isDragActive ? 'rgba(34,211,238,0.06)' : 'rgba(0,0,0,0.2)',
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="text-xs text-cyan-400 font-mono">UPLOADING...</div>
        ) : image ? (
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <Image size={12} className="text-cyan-400" />
              <span className="text-xs text-cyan-300 truncate font-mono">{image.filename}</span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {image.width} × {image.height}px · {(image.file_size_bytes / 1024).toFixed(1)}KB
            </div>
            {image.is_synthetic && (
              <div className="mt-1 text-xs text-amber-400 font-mono">SYNTHETIC TEST DATA</div>
            )}
          </div>
        ) : (
          <div>
            <Upload size={16} className="text-slate-500 mx-auto mb-1" />
            <div className="text-xs text-slate-500">Drop image or click</div>
            <div className="text-xs text-slate-600 mt-1">PNG · JPG · TIFF</div>
          </div>
        )}
      </div>
      {error && <div className="text-xs text-red-400 mt-1 font-mono">{error}</div>}
    </div>
  );
};

const Select: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="mb-3">
    <div className="text-xs text-slate-500 mb-1 tracking-wider">{label}</div>
    <div className="flex gap-1 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="px-2 py-1 rounded text-xs transition-all font-mono"
          style={{
            background: value === o.value ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
            color: value === o.value ? '#22d3ee' : '#64748b',
            border: value === o.value ? '1px solid rgba(34,211,238,0.4)' : '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, format, onChange }) => (
  <div className="mb-3">
    <div className="flex justify-between items-center mb-1">
      <div className="text-xs text-slate-500 tracking-wider">{label}</div>
      <div className="text-xs text-cyan-300 font-mono">{format ? format(value) : value}</div>
    </div>
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full"
    />
  </div>
);

export const ControlPanel: React.FC<{ onRun: () => void }> = ({ onRun }) => {
  const refImage = useStore((s) => s.refImage);
  const tgtImage = useStore((s) => s.tgtImage);
  const setRefImage = useStore((s) => s.setRefImage);
  const setTgtImage = useStore((s) => s.setTgtImage);
  const params = useStore((s) => s.params);
  const setParams = useStore((s) => s.setParams);
  const jobStatus = useStore((s) => s.jobStatus);

  const canRun = refImage && tgtImage && jobStatus !== 'running';

  return (
    <motion.aside
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
      className="glass fixed left-4 top-16 bottom-4 w-72 z-40 overflow-y-auto"
      style={{ padding: '16px' }}
    >
      <div className="text-xs text-slate-600 tracking-widest mb-4 pb-2 border-b border-cyan-900/30">
        CONTROL CONSOLE
      </div>

      {/* Data Sources */}
      <Section title="DATA SOURCES" icon={<Upload size={12} />}>
        <ImageDropZone label="REFERENCE IMAGE" image={refImage} onUpload={setRefImage} />
        <ImageDropZone label="TARGET IMAGE" image={tgtImage} onUpload={setTgtImage} />
        <div className="flex gap-2 pt-1">
          <button
            onClick={async () => {
              try {
                const res = await api.createSyntheticPair({
                  rotation_deg: 5.2,
                  scale: 1.05,
                  tx: 22.4,
                  ty: -14.6,
                  gamma: 1.4,
                  seed: 42,
                });
                setRefImage(res.reference);
                setTgtImage(res.target);
              } catch (e: unknown) {
                alert(e instanceof Error ? e.message : 'Generation failed');
              }
            }}
            className="flex-1 py-1.5 rounded text-[10px] font-mono tracking-wider border border-cyan-800/40 bg-cyan-950/40 text-cyan-300 hover:border-cyan-400 transition-all"
          >
            ⚡ QUICK SYNTHETIC
          </button>
        </div>
      </Section>

      {/* Registration Engine */}
      <Section title="FEATURE MATCHER & BACKBONE" icon={<Target size={12} />}>
        <Select
          label="DEEP LEARNING MATCHER"
          value={params.matcher ?? 'roma'}
          options={[
            { value: 'roma', label: 'RoMa (Flagship)' },
            { value: 'lightglue', label: 'LightGlue (Fast)' },
            { value: 'loftr', label: 'LoFTR (Baseline)' },
            { value: 'sift', label: 'SIFT (Classical)' },
          ]}
          onChange={(v) => setParams({ matcher: v as any })}
        />
        <div className="text-[10px] text-slate-400 font-mono mb-3 p-2 bg-[#080a0f] border border-[#1a1f2c]">
          {params.matcher === 'roma' && 'RoMa: Optimal under large viewpoint and solar phase angles. Coarse-to-fine dense matcher.'}
          {params.matcher === 'lightglue' && 'LightGlue: Sub-second inference. Adaptive depth GNN with confidence early exit.'}
          {params.matcher === 'loftr' && 'LoFTR: Detector-free coarse-to-fine transformer matching using linear self-attention.'}
          {params.matcher === 'sift' && 'Classical SIFT: Hand-crafted gradient histogram baseline. Retained strictly for empirical comparison.'}
        </div>

        {params.matcher !== 'sift' && (
          <>
            <Select
              label="VISION TRANSFORMER BACKBONE"
              value={params.backbone ?? 'dinov2_vits14'}
              options={[
                { value: 'dinov2_vits14', label: 'DINOv2 ViT-S/14' },
                { value: 'dinov2_vitb14', label: 'DINOv2 ViT-B/14' },
                { value: 'satellite_vit', label: 'Overhead ViT (Prithvi)' },
              ]}
              onChange={(v) => setParams({ backbone: v as any })}
            />
            <div className="text-[10px] text-cyan-400/80 font-mono mb-3">
              {params.backbone === 'dinov2_vits14' && 'DINOv2: Self-supervised ViT robust to illumination shifts.'}
              {params.backbone === 'dinov2_vitb14' && 'DINOv2-Large: 768-dim embedding for dense crater morphology.'}
              {params.backbone === 'satellite_vit' && 'Overhead ViT: Pretrained on orbital remote-sensing imagery.'}
            </div>
          </>
        )}

        <Select
          label="PREPROCESSING"
          value={params.preprocessing ?? 'clahe'}
          options={[
            { value: 'clahe', label: 'CLAHE' },
            { value: 'homomorphic', label: 'HOMOMORPHIC' },
            { value: 'none', label: 'NONE' },
          ]}
          onChange={(v) => setParams({ preprocessing: v as 'clahe' | 'homomorphic' | 'none' })}
        />
      </Section>

      {/* Precision Engine */}
      <Section title="PRECISION ENGINE" icon={<Sliders size={12} />}>
        <Select
          label="REFINEMENT METHOD"
          value={params.refinement_method ?? 'phase_correlation'}
          options={[
            { value: 'phase_correlation', label: 'PHASE' },
            { value: 'ecc', label: 'ECC' },
            { value: 'pyramid', label: 'PYRAMID' },
          ]}
          onChange={(v) => setParams({ refinement_method: v as 'phase_correlation' | 'ecc' | 'pyramid' })}
        />
        <Slider
          label="RANSAC THRESHOLD"
          value={params.ransac_threshold ?? 4.0}
          min={0.5} max={12} step={0.5}
          format={(v) => `${v.toFixed(1)} px`}
          onChange={(v) => setParams({ ransac_threshold: v })}
        />
        <Slider
          label="RATIO THRESHOLD"
          value={params.ratio_threshold ?? 0.75}
          min={0.5} max={0.95} step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => setParams({ ratio_threshold: v })}
        />
      </Section>

      {/* Advanced */}
      <Section title="ADVANCED" icon={<Cpu size={12} />} defaultOpen={false}>
        <Slider
          label="MAX FEATURES"
          value={params.max_features ?? 8000}
          min={500} max={25000} step={500}
          format={(v) => v.toLocaleString()}
          onChange={(v) => setParams({ max_features: v })}
        />
        <Slider
          label="GRID N (uniformity)"
          value={params.grid_n ?? 8}
          min={4} max={16} step={1}
          onChange={(v) => setParams({ grid_n: v })}
        />
        <Slider
          label="GRID M (uniformity)"
          value={params.grid_m ?? 8}
          min={4} max={16} step={1}
          onChange={(v) => setParams({ grid_m: v })}
        />
      </Section>

      {/* Run button */}
      <motion.button
        whileHover={{ scale: canRun ? 1.02 : 1 }}
        whileTap={{ scale: canRun ? 0.98 : 1 }}
        onClick={canRun ? onRun : undefined}
        disabled={!canRun}
        className="w-full py-3 rounded-lg text-sm font-semibold tracking-widest transition-all mt-2"
        style={{
          background: canRun
            ? 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(6,182,212,0.15))'
            : 'rgba(255,255,255,0.03)',
          border: canRun ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.06)',
          color: canRun ? '#22d3ee' : '#334155',
          cursor: canRun ? 'pointer' : 'not-allowed',
          boxShadow: canRun ? '0 0 20px rgba(34,211,238,0.15)' : 'none',
        }}
      >
        {jobStatus === 'running' ? 'PROCESSING...' : 'RUN REGISTRATION'}
      </motion.button>

      {!refImage || !tgtImage ? (
        <p className="text-xs text-slate-600 text-center mt-2">Upload both images to run</p>
      ) : null}
    </motion.aside>
  );
};
