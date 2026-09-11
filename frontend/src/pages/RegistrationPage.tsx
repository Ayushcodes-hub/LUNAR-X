import React from 'react';
import { motion } from 'motion/react';
import { ControlPanel } from '../components/ControlPanel';
import { ImageViewer } from '../components/ImageViewer';
import { PipelineTimeline } from '../components/PipelineTimeline';
import { MetricsPanel } from '../components/MetricsPanel';
import { ConvergenceGraph } from '../components/ConvergenceGraph';
import { SubPixelLab } from '../components/SubPixelLab';
import { useStore } from '../store';
import { api } from '../services/api';

export const RegistrationPage: React.FC = () => {
  const refImage = useStore((s) => s.refImage);
  const tgtImage = useStore((s) => s.tgtImage);
  const params = useStore((s) => s.params);
  const setJobId = useStore((s) => s.setJobId);
  const setJobStatus = useStore((s) => s.setJobStatus);
  const clearEvents = useStore((s) => s.clearEvents);
  const setLiveMetrics = useStore((s) => s.setLiveMetrics);
  const setResult = useStore((s) => s.setResult);

  const handleRun = async () => {
    if (!refImage || !tgtImage) return;

    clearEvents();
    setLiveMetrics({});
    setResult(null);
    setJobStatus('running');

    try {
      const fullParams = {
        reference_path: refImage.path,
        target_path: tgtImage.path,
        matcher: params.matcher ?? 'sift',
        preprocessing: params.preprocessing ?? 'clahe',
        refinement_method: params.refinement_method ?? 'phase_correlation',
        ransac_threshold: params.ransac_threshold ?? 4.0,
        ratio_threshold: params.ratio_threshold ?? 0.75,
        max_features: params.max_features ?? 8000,
        grid_n: params.grid_n ?? 8,
        grid_m: params.grid_m ?? 8,
      };

      const res = await api.createJob(fullParams);
      setJobId(res.job_id);
    } catch (e) {
      console.error('Failed to dispatch registration job:', e);
      setJobStatus('failed');
    }
  };

  return (
    <div className="relative w-full h-full pt-16 pb-4 px-4 flex gap-4 overflow-hidden">
      {/* Left Column: Control Panel */}
      <ControlPanel onRun={handleRun} />

      {/* Center Column: Viewer + Timeline + SubPixelLab + Convergence */}
      <motion.main
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex-1 flex flex-col gap-4 ml-76 mr-76 overflow-y-auto pr-1"
        style={{ height: 'calc(100vh - 80px)' }}
      >
        {/* Pipeline Stage Timeline */}
        <div className="w-full flex-shrink-0">
          <PipelineTimeline />
        </div>

        {/* 10-Mode Main Scientific Viewer */}
        <div className="w-full h-96 flex-shrink-0">
          <ImageViewer />
        </div>

        {/* Bottom Split: SubPixel Lab & Convergence Graph */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-shrink-0">
          <SubPixelLab />
          <ConvergenceGraph />
        </div>
      </motion.main>

      {/* Right Column: Intelligence & Real-time Metrics Panel */}
      <MetricsPanel />
    </div>
  );
};
