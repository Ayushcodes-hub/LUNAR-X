import React from 'react';
import { Settings, Cpu, ShieldAlert, Sliders } from 'lucide-react';
import { HealthStatus } from '../components/HealthStatus';
import { useStore } from '../store';

export const SettingsPage: React.FC = () => {
  const setParams = useStore((s) => s.setParams);

  const presets = [
    {
      name: 'OHRC → LRO NAC (High Precision)',
      matcher: 'sift',
      preprocessing: 'clahe',
      refinement: 'pyramid',
      ransac: 3.5,
      features: 12000,
      desc: 'Optimized for high-resolution 0.25m to 0.5m crater topography alignment.',
    },
    {
      name: 'TMC-2 → SELENE (Stereo / Scale Invariant)',
      matcher: 'loftr',
      preprocessing: 'homomorphic',
      refinement: 'phase_correlation',
      ransac: 4.5,
      features: 8000,
      desc: 'Dense deep feature matching designed for significant scale ratios and illumination differences.',
    },
    {
      name: 'IIRS Hyperspectral → Optical Base',
      matcher: 'sift',
      preprocessing: 'homomorphic',
      refinement: 'ecc',
      ransac: 5.0,
      features: 6000,
      desc: 'Homomorphic frequency-domain filtering for extreme spectral contrast variations.',
    },
  ];

  return (
    <div className="relative w-full h-full pt-20 pb-8 px-8 overflow-y-auto max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-cyan-900/30 pb-4">
        <div className="flex items-center gap-3">
          <Settings className="text-cyan-400" size={24} />
          <h1 className="text-xl font-bold tracking-widest text-cyan-400">MISSION CONTROL SETTINGS & TELEMETRY</h1>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          System telemetry, service verification center, and sensor pair configuration presets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Integration Status Center */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-cyan-900/30 pb-2">
            <Cpu className="text-cyan-400" size={16} />
            <h2 className="text-xs font-bold text-slate-200 tracking-wider">INTEGRATION & SERVICE STATUS</h2>
          </div>
          <HealthStatus />
        </div>

        {/* Right: Sensor Configuration Presets */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-cyan-900/30 pb-2">
            <Sliders className="text-cyan-400" size={16} />
            <h2 className="text-xs font-bold text-slate-200 tracking-wider">SENSOR PAIR REGISTRATION PRESETS</h2>
          </div>

          <div className="space-y-3">
            {presets.map((p) => (
              <div
                key={p.name}
                className="p-3 rounded bg-black/40 border border-cyan-900/30 hover:border-cyan-500/50 transition-all cursor-pointer"
                onClick={() => {
                  setParams({
                    matcher: p.matcher as any,
                    preprocessing: p.preprocessing as any,
                    refinement_method: p.refinement as any,
                    ransac_threshold: p.ransac,
                    max_features: p.features,
                  });
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-cyan-300">{p.name}</span>
                  <span className="text-xs font-mono text-slate-500">
                    {p.matcher.toUpperCase()} + {p.preprocessing.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mb-2">{p.desc}</p>
                <div className="flex gap-2 text-xs font-mono text-slate-500">
                  <span>RANSAC: {p.ransac}px</span>
                  <span>·</span>
                  <span>Refine: {p.refinement}</span>
                  <span>·</span>
                  <span>Features: {p.features}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security & Reality Integrity Policy */}
      <div className="glass p-5 border-cyan-500/20">
        <div className="flex items-center gap-2 mb-2 text-cyan-400">
          <ShieldAlert size={16} />
          <h2 className="text-xs font-bold tracking-wider">LUNARIS SCIENTIFIC INTEGRITY & SECURITY POLICY</h2>
        </div>
        <p className="text-xs text-slate-400 font-mono leading-relaxed">
          In strict adherence to the project charter: No credentials, metrics, or telemetry are ever fabricated, simulated, or mocked. All sub-pixel offsets, inlier ratios, RMSE calculations, and hardware statuses originate directly from verified execution on the host machine.
        </p>
      </div>
    </div>
  );
};
