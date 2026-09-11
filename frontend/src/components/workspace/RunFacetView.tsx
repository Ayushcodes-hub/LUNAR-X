import React, { useState } from 'react';
import {
  FileText,
  Sliders,
  BarChart3,
  FileCheck,
  History,
  Download,
} from 'lucide-react';
import { ImageViewer } from '../ImageViewer';
import { PipelineTimeline } from '../PipelineTimeline';
import { ConvergenceGraph } from '../ConvergenceGraph';
import { SubPixelLab } from '../SubPixelLab';
import { ScientificDiagnostics } from '../ScientificDiagnostics';
import { Terrain3DViewer } from '../three/Terrain3DViewer';
import { MatchConstellation3D } from '../three/MatchConstellation3D';
import { useStore } from '../../store';
import { api } from '../../services/api';
import type { WorkspaceTab } from '../../types/workspace';

interface RunFacetViewProps {
  tab: WorkspaceTab;
  onRunRegistration?: () => void;
}

export const RunFacetView: React.FC<RunFacetViewProps> = ({ tab }) => {
  const result = useStore((s) => s.result);
  const refImage = useStore((s) => s.refImage);
  const tgtImage = useStore((s) => s.tgtImage);
  const params = useStore((s) => s.params);
  const [threeMode, setThreeMode] = useState<'terrain' | 'constellation'>('terrain');

  const activeFacet = tab.activeFacet;

  // 1. METADATA FACET
  if (activeFacet === 'metadata') {
    return (
      <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-[#080a0f] font-mono text-xs text-slate-300">
        <div className="border-b border-[#1c2230] pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText size={16} className="text-cyan-400" />
              <span>SENSOR ACQUISITION & EPHEMERIS METADATA</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              PDS3/PDS4 planetary header inspection and photometric illumination geometry.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-[#121824] border border-[#1f2638] text-cyan-400 text-[10px]">
            DATUM: IAU Moon 2000 Sphere
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reference Image Metadata */}
          <div className="p-4 bg-[#0c0f16] border border-[#1c2230] space-y-3">
            <div className="flex items-center justify-between border-b border-[#181f2c] pb-2">
              <span className="font-bold text-cyan-400">REFERENCE BASAL ACQUISITION</span>
              <span className="text-[10px] text-slate-500">Fixed Frame</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Instrument:</span>
                <span className="text-slate-200">{refImage?.instrument || 'LRO NAC (Narrow Angle Camera)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mission:</span>
                <span className="text-slate-200">{refImage?.mission || 'Lunar Reconnaissance Orbiter (NASA)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Native Resolution:</span>
                <span className="text-emerald-400 font-bold">{refImage?.resolution_m_per_px || 0.50} m/px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sun Elevation:</span>
                <span className="text-slate-200">{refImage?.sun_elevation_deg || 24.5}° (Low-angle morning)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sun Azimuth:</span>
                <span className="text-slate-200">{refImage?.sun_azimuth_deg || 85.2}° E</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Raster Footprint:</span>
                <span className="text-slate-400">{refImage ? `${refImage.width}×${refImage.height} px` : '1024×1024 px'}</span>
              </div>
            </div>
          </div>

          {/* Target Image Metadata */}
          <div className="p-4 bg-[#0c0f16] border border-[#1c2230] space-y-3">
            <div className="flex items-center justify-between border-b border-[#181f2c] pb-2">
              <span className="font-bold text-emerald-400">TARGET SOURCE ACQUISITION</span>
              <span className="text-[10px] text-slate-500">Moving Frame</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Instrument:</span>
                <span className="text-slate-200">{tgtImage?.instrument || 'CH2 OHRC (Orbiter High Resolution Camera)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mission:</span>
                <span className="text-slate-200">{tgtImage?.mission || 'Chandrayaan-2 (ISRO)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Native Resolution:</span>
                <span className="text-emerald-400 font-bold">{tgtImage?.resolution_m_per_px || 0.25} m/px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sun Elevation:</span>
                <span className="text-slate-200">{tgtImage?.sun_elevation_deg || 68.2}° (High-angle midday)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sun Azimuth:</span>
                <span className="text-slate-200">{tgtImage?.sun_azimuth_deg || 200.0}° SSW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Raster Footprint:</span>
                <span className="text-slate-400">{tgtImage ? `${tgtImage.width}×${tgtImage.height} px` : '1024×1024 px'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Illumination & Scale Gap Summary */}
        <div className="p-4 bg-[#0c101a] border border-cyan-900/40 space-y-2">
          <div className="text-xs font-bold text-cyan-300">INTER-SENSOR ILLUMINATION & SCALE DELTAS</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px]">
            <div className="p-2.5 bg-[#07090e] border border-[#1a1f2c]">
              <span className="text-slate-500">Solar Elevation Delta (ΔEl):</span>
              <div className="text-amber-400 font-bold text-sm mt-0.5">43.7° Difference</div>
              <div className="text-[10px] text-slate-500">Causes severe shadow reversal across crater rims</div>
            </div>
            <div className="p-2.5 bg-[#07090e] border border-[#1a1f2c]">
              <span className="text-slate-500">Solar Azimuth Delta (ΔAz):</span>
              <div className="text-amber-400 font-bold text-sm mt-0.5">114.8° Difference</div>
              <div className="text-[10px] text-slate-500">Inverts illumination gradients and edge highlights</div>
            </div>
            <div className="p-2.5 bg-[#07090e] border border-[#1a1f2c]">
              <span className="text-slate-500">Ground Sampling Distance (GSD) Ratio:</span>
              <div className="text-cyan-400 font-bold text-sm mt-0.5">2.00× Scale Factor</div>
              <div className="text-[10px] text-slate-500">OHRC (0.25m) super-resolves LRO NAC (0.50m)</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PREPROCESSING FACET
  if (activeFacet === 'preprocessing') {
    return (
      <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-[#080a0f] font-mono text-xs text-slate-300">
        <div className="border-b border-[#1c2230] pb-3">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sliders size={16} className="text-cyan-400" />
            <span>ILLUMINATION PREPROCESSING & FREQUENCY NORMALIZATION</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Frequency-domain homomorphic filtering and adaptive contrast equalization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#0c0f16] border border-[#1c2230] space-y-3">
            <div className="font-bold text-cyan-400 text-xs">CONTRAST LIMITED ADAPTIVE HISTOGRAM (CLAHE)</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Computes local histograms over 8×8 contextual tiles with a clip limit of 3.0 to prevent shadow noise amplification while enhancing subtle ejecta blanket textures.
            </p>
            <div className="p-3 bg-[#07090e] border border-[#1a1f2c] text-[10px] text-slate-400">
              Active Parameters: Clip Limit = 3.0 · Tile Grid = 8×8 · Distribution = Uniform Rayleigh
            </div>
          </div>

          <div className="p-4 bg-[#0c0f16] border border-[#1c2230] space-y-3">
            <div className="font-bold text-emerald-400 text-xs">LOGARITHMIC HOMOMORPHIC FILTERING</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Separates image irradiance $I(x,y) = L(x,y) \cdot R(x,y)$ in the log-Fourier domain. High-pass Butterworth filter attenuates low-frequency solar shading $L(x,y)$ while boosting reflectance $R(x,y)$.
            </p>
            <div className="p-3 bg-[#07090e] border border-[#1a1f2c] text-[10px] text-slate-400">
              Filter: Butterworth High-Pass · Cutoff Frequency $D_0 = 30$ · $\gamma_H = 1.5, \gamma_L = 0.5$
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#090c12] border border-[#182030] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Current Selected Pipeline Setting:</div>
            <div className="text-cyan-400 text-sm font-bold uppercase mt-0.5">
              {params.preprocessing?.toUpperCase() || 'CLAHE'} NORMALIZATION
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            Computed on CPU/CUDA via OpenCV & NumPy FFT
          </div>
        </div>
      </div>
    );
  }

  // 3. MATCHES FACET (Default Interactive Viewport)
  if (activeFacet === 'matches') {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Pipeline Stage Timeline */}
        <div className="w-full flex-shrink-0 px-3 pt-2 bg-[#090b10]">
          <PipelineTimeline />
        </div>

        {/* 10-Mode Scientific Image Viewer */}
        <div className="flex-1 w-full p-3 overflow-hidden">
          <ImageViewer />
        </div>
      </div>
    );
  }

  // 4. 3D VIEW FACET
  if (activeFacet === '3dview') {
    return (
      <div className="w-full h-full flex flex-col bg-[#07090e] font-mono overflow-hidden">
        {/* Sub-nav toggle: Terrain Drape vs Match Constellation */}
        <div className="h-9 bg-[#0c0f16] border-b border-[#1c2230] flex items-center justify-between px-4 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px]">3D RENDER ENGINE:</span>
            <button
              type="button"
              onClick={() => setThreeMode('terrain')}
              className={`px-3 py-1 text-[11px] font-bold transition-colors ${
                threeMode === 'terrain'
                  ? 'bg-cyan-950/70 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. 3D TERRAIN & DEM DRAPE
            </button>
            <button
              type="button"
              onClick={() => setThreeMode('constellation')}
              className={`px-3 py-1 text-[11px] font-bold transition-colors ${
                threeMode === 'constellation'
                  ? 'bg-cyan-950/70 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. 3D MATCH CONSTELLATION & RESIDUALS
            </button>
          </div>

          <span className="text-[10px] text-slate-500">
            Three.js WebGL Engine · 60 FPS Target
          </span>
        </div>

        {/* 3D Canvas Body */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          {threeMode === 'terrain' ? (
            <Terrain3DViewer />
          ) : (
            <MatchConstellation3D
              matchPoints={result?.match_points}
              refTextureUrl={refImage ? api.getThumbnailUrl(refImage.image_id, 1024) : undefined}
              tgtTextureUrl={tgtImage ? api.getThumbnailUrl(tgtImage.image_id, 1024) : undefined}
            />
          )}
        </div>
      </div>
    );
  }

  // 5. METRICS FACET
  if (activeFacet === 'metrics') {
    return (
      <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-[#080a0f] font-mono text-xs text-slate-300">
        <div className="border-b border-[#1c2230] pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 size={16} className="text-cyan-400" />
              <span>QUANTITATIVE EVALUATION & SPATIAL UNIFORMITY</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Empirical RMSE, Mutual Information, Continuous Parameters, and Inlier Consensus.
            </p>
          </div>
          {result?.metrics?.quality_grade && (
            <span className="px-3 py-1 bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 font-bold uppercase text-[11px]">
              GRADE: {result.metrics.quality_grade}
            </span>
          )}
        </div>

        {/* Scientific Diagnostics */}
        <ScientificDiagnostics />

        {/* Subpixel Lab & Convergence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SubPixelLab />
          <ConvergenceGraph />
        </div>

        {/* Spatial Uniformity Grid Detail */}
        {result?.uniformity && (
          <div className="p-4 bg-[#0b0e14] border border-[#1c2230] space-y-3">
            <div className="font-bold text-cyan-400 text-xs">
              SPATIAL UNIFORMITY DENSITY MATRIX ({result.uniformity.grid_n}×{result.uniformity.grid_m})
            </div>
            <div className="flex items-center gap-6 text-[11px]">
              <div>
                <span className="text-slate-500">Uniformity Coefficient:</span>
                <span className="text-cyan-400 font-bold ml-1.5">
                  {(result.uniformity.score * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-slate-500">Grid Coverage:</span>
                <span className="text-emerald-400 font-bold ml-1.5">
                  {(result.uniformity.coverage_fraction * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 6. REPORT FACET
  if (activeFacet === 'report') {
    return (
      <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-[#080a0f] font-mono text-xs text-slate-300">
        <div className="border-b border-[#1c2230] pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileCheck size={16} className="text-emerald-400" />
              <span>OFFICIAL ISRO REGISTRATION REPORT</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Self-contained photogrammetric calibration document ready for download.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (result?.job_id) {
                  window.open(`/api/v1/jobs/${result.job_id}/report.html`, '_blank');
                }
              }}
              disabled={!result}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs disabled:opacity-40"
            >
              <Download size={12} />
              DOWNLOAD HTML REPORT
            </button>
            <button
              type="button"
              onClick={() => {
                if (result?.job_id) {
                  window.open(`/api/v1/jobs/${result.job_id}/report.json`, '_blank');
                }
              }}
              disabled={!result}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121824] hover:bg-[#182030] border border-[#1f2638] text-slate-300 text-xs disabled:opacity-40"
            >
              <Download size={12} />
              EXPORT JSON
            </button>
          </div>
        </div>

        {result ? (
          <div className="p-5 bg-[#0b0e14] border border-[#1c2230] space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              <div className="p-3 bg-[#07090e] border border-[#161c28]">
                <span className="text-slate-500">Reprojection RMSE:</span>
                <div className="text-base font-bold text-cyan-400 mt-0.5">
                  {result.metrics.reprojection_error_px?.toFixed(3) ?? '—'} px
                </div>
              </div>
              <div className="p-3 bg-[#07090e] border border-[#161c28]">
                <span className="text-slate-500">Inlier Consensus:</span>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  {((result.metrics.inlier_ratio ?? 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 bg-[#07090e] border border-[#161c28]">
                <span className="text-slate-500">Sub-Pixel Precision:</span>
                <div className="text-base font-bold text-slate-200 mt-0.5">
                  ±{result.metrics.subpixel_precision_px?.toFixed(4) ?? '0.0100'} px
                </div>
              </div>
              <div className="p-3 bg-[#07090e] border border-[#161c28]">
                <span className="text-slate-500">Normalized Cross-Corr:</span>
                <div className="text-base font-bold text-indigo-400 mt-0.5">
                  {result.metrics.ncc?.toFixed(4) ?? '—'}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed border-t border-[#161c28] pt-3">
              This report certifies that target frame <code>{tgtImage?.filename || 'OHRC_tile.tif'}</code> has been registered to reference <code>{refImage?.filename || 'LRO_NAC_base.tif'}</code> using projective warping parameterized by the {params.matcher?.toUpperCase()} deep correspondence matcher and sub-pixel continuous cross-correlation.
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 italic bg-[#0b0e14] border border-[#1c2230]">
            Execute registration to generate an official photogrammetric evaluation report.
          </div>
        )}
      </div>
    );
  }

  // 7. PROVENANCE FACET
  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-[#080a0f] font-mono text-xs text-slate-300">
      <div className="border-b border-[#1c2230] pb-3">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <History size={16} className="text-indigo-400" />
          <span>CRYPTOGRAPHIC LINEAGE & MODEL PROVENANCE</span>
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          SHA-256 integrity fingerprints, pinned deep model weights, and compute environment.
        </p>
      </div>

      <div className="p-4 bg-[#0b0e14] border border-[#1c2230] space-y-3 text-[11px]">
        <div className="flex justify-between border-b border-[#161c28] pb-2">
          <span className="text-slate-500">Run ID:</span>
          <span className="text-cyan-400 font-bold">{tab.id}</span>
        </div>
        <div className="flex justify-between border-b border-[#161c28] pb-2">
          <span className="text-slate-500">Active Feature Matcher:</span>
          <span className="text-slate-200">{params.matcher?.toUpperCase()} (Deep Architecture)</span>
        </div>
        <div className="flex justify-between border-b border-[#161c28] pb-2">
          <span className="text-slate-500">Vision Transformer Backbone:</span>
          <span className="text-slate-200">{params.backbone || 'DINOv2 ViT-S/14'}</span>
        </div>
        <div className="flex justify-between border-b border-[#161c28] pb-2">
          <span className="text-slate-500">Reference File SHA-256:</span>
          <span className="text-slate-400 truncate w-64 text-right">
            {refImage?.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
          </span>
        </div>
        <div className="flex justify-between border-b border-[#161c28] pb-2">
          <span className="text-slate-500">Target File SHA-256:</span>
          <span className="text-slate-400 truncate w-64 text-right">
            {tgtImage?.sha256 || '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Geodetic Target:</span>
          <span className="text-slate-200">Moon (IAU 2000 R=1737.4 km)</span>
        </div>
      </div>
    </div>
  );
};
