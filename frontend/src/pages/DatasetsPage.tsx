import React from 'react';
import { motion } from 'motion/react';
import { Database, ExternalLink, HardDrive, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';

export const DatasetsPage: React.FC = () => {
  const setCurrentPage = useStore((s) => s.setCurrentPage);

  const missions = [
    {
      name: 'Chandrayaan-2 OHRC',
      instrument: 'Orbiter High Resolution Camera',
      resolution: '0.25 m/pixel',
      spectral: 'Optical (Panchromatic)',
      portal: 'https://pradan.issdc.gov.in/ch2/',
      status: 'CONFIGURATION REQUIRED',
      statusColor: '#fbbf24',
      note: 'Access requires ISRO PRADAN authentication or downloaded PDS4 product files.',
    },
    {
      name: 'Chandrayaan-2 TMC-2',
      instrument: 'Terrain Mapping Camera-2',
      resolution: '5.0 m/pixel',
      spectral: 'Stereo Optical (Triplet)',
      portal: 'https://pradan.issdc.gov.in/ch2/',
      status: 'CONFIGURATION REQUIRED',
      statusColor: '#fbbf24',
      note: 'Generates high-resolution lunar DEMs; multi-view angle coverage.',
    },
    {
      name: 'Chandrayaan-2 IIRS',
      instrument: 'Imaging Infra-Red Spectrometer',
      resolution: '80 m/pixel',
      spectral: '0.8 to 5.0 µm hyperspectral',
      portal: 'https://pradan.issdc.gov.in/ch2/',
      status: 'CONFIGURATION REQUIRED',
      statusColor: '#fbbf24',
      note: 'Hyperspectral mineralogical dataset; severe spectral contrast delta vs optical.',
    },
    {
      name: 'NASA LRO NAC',
      instrument: 'Narrow Angle Camera',
      resolution: '0.5 to 2.0 m/pixel',
      spectral: 'Panchromatic (Optical)',
      portal: 'https://pds.lroc.asu.edu/data/',
      status: 'PUBLIC ARCHIVE',
      statusColor: '#4ade80',
      note: 'Standard high-resolution lunar reference basemap; publicly available via ASU PDS.',
    },
    {
      name: 'JAXA SELENE (Kaguya)',
      instrument: 'Terrain Camera (TC)',
      resolution: '10 m/pixel',
      spectral: 'Panchromatic Stereo',
      portal: 'https://darts.isas.jaxa.jp/planet/pdap/selene/',
      status: 'PUBLIC ARCHIVE',
      statusColor: '#4ade80',
      note: 'Global lunar reference orthomosaic and topography.',
    },
  ];

  return (
    <div className="relative w-full h-full pt-20 pb-8 px-8 overflow-y-auto max-w-6xl mx-auto">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Database className="text-cyan-400" size={24} />
          <h1 className="text-xl font-bold tracking-widest text-cyan-400">DATASET EXPLORER & SENSOR REGISTRY</h1>
        </div>
        <p className="text-xs text-slate-400 font-mono leading-relaxed">
          Mission specifications and data acquisition archives for SIH26166 multimodal lunar correspondence.
        </p>
      </motion.div>

      {/* Dataset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {missions.map((m, idx) => (
          <motion.div
            key={m.name}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
            className="glass p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-bold text-slate-200 tracking-wide">{m.name}</span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                  style={{
                    color: m.statusColor,
                    background: `${m.statusColor}15`,
                    border: `1px solid ${m.statusColor}40`,
                    fontSize: 9,
                  }}
                >
                  {m.status}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono mb-4 text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Instrument:</span>
                  <span className="text-slate-300 text-right truncate max-w-[140px]">{m.instrument}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resolution:</span>
                  <span className="text-cyan-300">{m.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Modality:</span>
                  <span className="text-slate-300">{m.spectral}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-4">{m.note}</p>
            </div>

            <a
              href={m.portal}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 rounded text-xs font-mono text-cyan-400 border border-cyan-900/40 hover:bg-cyan-950/40 transition-colors"
            >
              <span>DATA ARCHIVE</span>
              <ExternalLink size={12} />
            </a>
          </motion.div>
        ))}

        {/* Synthetic Generator Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass p-5 flex flex-col justify-between border-cyan-500/30"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.05), rgba(0,0,0,0.3))' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="text-amber-400" size={18} />
              <span className="text-sm font-bold text-amber-300">SYNTHETIC TEST BENCH</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Generate procedural crater fields or apply calibrated sub-pixel transforms with known ground truth homography matrices.
            </p>
            <div className="text-xs font-mono text-slate-500 space-y-1 mb-4">
              <div>• Procedural Multi-Octave Noise</div>
              <div>• Sub-Pixel Geometric Perturbation</div>
              <div>• Synthetic Sun Angle (Gamma) Shifts</div>
            </div>
          </div>

          <button
            onClick={() => setCurrentPage('registration')}
            className="w-full py-2 rounded text-xs font-mono font-bold tracking-wider text-cyan-300 bg-cyan-950/60 border border-cyan-400/40 hover:bg-cyan-900/60 transition-colors"
          >
            GO TO REGISTRATION BENCH
          </button>
        </motion.div>
      </div>

      {/* Notice Banner */}
      <div className="glass p-4 border-amber-500/20 bg-amber-950/10 flex items-start gap-3">
        <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={16} />
        <div className="text-xs text-slate-400 leading-relaxed font-mono">
          <span className="text-amber-400 font-bold">INTEGRITY ADVISORY: </span>
          In accordance with scientific integrity rules, external satellite missions requiring authentication (ISSDC PRADAN) are not simulated with fake API tokens. Users can ingest local GeoTIFF / PDS raster files directly via the registration dropzone.
        </div>
      </div>
    </div>
  );
};
