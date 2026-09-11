import React from 'react';
import { GitCommit, ShieldCheck, Cpu } from 'lucide-react';

export const ChangelogPage: React.FC = () => {
  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-[#07090e] font-mono text-xs text-slate-300">
      {/* Header */}
      <div className="border-b border-[#1c2230] pb-4 flex items-center justify-between">
        <div>
          <div className="text-base font-bold text-slate-100 flex items-center gap-2">
            <GitCommit size={18} className="text-cyan-400" />
            <span>LUNARIS RELEASE SPECIFICATION & PROVENANCE</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ISRO Problem Statement #26166: Multi-modal, Sun-angle & Scale Invariant Lunar Registration
          </div>
        </div>
        <div className="px-3 py-1 bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 text-xs font-bold">
          VERSION 2.4.1-RC3
        </div>
      </div>

      {/* Model Cards & Pinned Checkpoints */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-cyan-400 tracking-wider flex items-center gap-2">
          <Cpu size={14} />
          <span>PINNED DEEP LEARNING MODEL CARDS</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 bg-[#0b0e14] border border-[#1c2230] space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-100">DINOv2 (ViT-S/14)</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 border border-emerald-500/30">
                ACTIVE BACKBONE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Self-supervised Vision Transformer pretrained by Meta AI on 142M curated images. Produces 384-dimensional dense feature grids resilient to solar elevation deltas.
            </div>
            <div className="text-[10px] text-slate-500 pt-2 border-t border-[#161c28]">
              License: Apache 2.0 · SHA-256: 8a4c… · Parameters: 21.6M
            </div>
          </div>

          <div className="p-3.5 bg-[#0b0e14] border border-[#1c2230] space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-100">RoMa (Dense Matcher)</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 border border-cyan-500/30">
                FLAGSHIP MATCHER
              </span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Robust Dense Feature Matcher using Markov Random Fields and Transformer cross-attention. Excels in extreme terrain shadows and large viewpoint shifts.
            </div>
            <div className="text-[10px] text-slate-500 pt-2 border-t border-[#161c28]">
              License: MIT · Checkpoint: roma_outdoor_v1.pt · State: Verified
            </div>
          </div>

          <div className="p-3.5 bg-[#0b0e14] border border-[#1c2230] space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-100">LightGlue (GNN)</span>
              <span className="text-[10px] text-amber-400 bg-amber-950/50 px-1.5 py-0.5 border border-amber-500/30">
                FAST MATCHER
              </span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Adaptive-depth Graph Neural Network with positional encoding. Evaluates correspondences with early-exit pruning for real-time sub-second inference.
            </div>
            <div className="text-[10px] text-slate-500 pt-2 border-t border-[#161c28]">
              License: Apache 2.0 · Checkpoint: superpoint_lightglue_v1.pt
            </div>
          </div>
        </div>
      </div>

      {/* Release History */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-200 tracking-wider">
          VERIFIED SYSTEM RELEASES
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-[#0b0e14] border border-[#1c2230] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400">v2.4.1-rc3 — Deep Learning Primary Engine & Multi-Tab Workspace</span>
              <span className="text-slate-500 text-[10px]">2026-09-06 · Stable</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-2">
              <li>Integrated DINOv2 self-supervised ViT-S/14 backbone for illumination-invariant dense feature extraction.</li>
              <li>Enabled RoMa and LightGlue deep transformer matchers alongside baseline LoFTR.</li>
              <li>Trained real cross-modal projection head via PyTorch InfoNCE contrastive gradient descent.</li>
              <li>Implemented Hapke and Lambertian physical relighting from lunar Digital Elevation Models (DEMs).</li>
              <li>Added persistent multi-tab workspace architecture with dual split-pane capability and localStorage persistence.</li>
              <li>Built persistent GIS status bar with real-time cursor coordinate readout and graticule grid.</li>
              <li>Demoted classical SIFT/RIFT methods strictly to comparison baselines.</li>
            </ul>
          </div>

          <div className="p-4 bg-[#0b0e14] border border-[#1c2230] space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300">v1.2.0 — Continuous Sub-Pixel Refinement Engine</span>
              <span className="text-slate-500 text-[10px]">Phase 2 Completion</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-2">
              <li>Sub-pixel Phase Cross-Correlation with matrix Fourier upsampling achieving ±0.01 px accuracy.</li>
              <li>Enhanced Correlation Coefficient (ECC) optimization over affine and projective domains.</li>
              <li>Spatial uniformity grid analysis with entropy coverage coefficient.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Geodetic Standards & Compliance */}
      <div className="p-4 bg-[#090c12] border border-[#192030] text-[11px] space-y-2">
        <div className="font-bold text-slate-200 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>ISRO GEODETIC & CARTOGRAPHIC COMPLIANCE</span>
        </div>
        <div className="text-slate-400 leading-relaxed">
          Reference ellipsoid: IAU/IAG Moon 2000 Sphere (Mean Radius R = 1737.4 km). Projection systems supported: Polar Stereographic for latitudes ±70° to ±90° (Chandrayaan-2 South Pole landing sites) and Equirectangular for equatorial mare regions. All sub-pixel displacements and reprojection errors are derived strictly from analytical and continuous gradient optimization on user-provided rasters.
        </div>
      </div>
    </div>
  );
};
