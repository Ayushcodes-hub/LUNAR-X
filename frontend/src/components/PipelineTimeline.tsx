// PipelineTimeline — live horizontal pipeline visualization
// Each stage animates based on real SSE events, not timers
import React from 'react';
import { motion } from 'motion/react';
import { Check, AlertCircle, Loader } from 'lucide-react';
import { useStore } from '../store';
import { PIPELINE_STAGES } from '../types/api';

const STAGE_LABELS: Record<string, string> = {
  ingestion: 'DATA\nINGESTION',
  preprocessing: 'PREPROCESSING',
  feature_extraction: 'FEATURE\nANALYSIS',
  feature_matching: 'FEATURE\nMATCHING',
  geometric_estimation: 'GEOMETRIC\nESTIMATION',
  subpixel_refinement: 'SUB-PIXEL\nREFINEMENT',
  evaluation: 'QUALITY\nVALIDATION',
  complete: 'REGISTRATION\nCOMPLETE',
};

export const PipelineTimeline: React.FC = () => {
  const events = useStore((s) => s.events);

  // Build stage status from real events
  const stageStatus = React.useMemo(() => {
    const map: Record<string, 'idle' | 'running' | 'done' | 'failed'> = {};
    events.forEach((e) => {
      if (e.status === 'running') map[e.stage] = 'running';
      else if (e.status === 'done') map[e.stage] = 'done';
      else if (e.status === 'failed') map[e.stage] = 'failed';
    });
    return map;
  }, [events]);

  const lastEvent = events[events.length - 1];

  return (
    <div className="glass px-6 py-3 flex items-center gap-2 overflow-x-auto"
      style={{ minHeight: 72 }}>
      {PIPELINE_STAGES.map((stage, idx) => {
        const status = stageStatus[stage] ?? 'idle';
        const isActive = status === 'running';
        const isDone = status === 'done';
        const isFailed = status === 'failed';

        return (
          <React.Fragment key={stage}>
            <motion.div
              className="flex flex-col items-center gap-1 cursor-default min-w-[60px]"
              title={lastEvent?.stage === stage ? lastEvent.message : stage}
            >
              {/* Icon */}
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                animate={isActive ? { boxShadow: ['0 0 6px rgba(34,211,238,0.4)', '0 0 18px rgba(34,211,238,0.9)', '0 0 6px rgba(34,211,238,0.4)'] } : {}}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{
                  background: isDone ? 'rgba(74,222,128,0.12)' :
                               isFailed ? 'rgba(248,113,113,0.12)' :
                               isActive ? 'rgba(34,211,238,0.12)' :
                               'rgba(255,255,255,0.04)',
                  border: `1px solid ${
                    isDone ? 'rgba(74,222,128,0.5)' :
                    isFailed ? 'rgba(248,113,113,0.5)' :
                    isActive ? 'rgba(34,211,238,0.6)' :
                    'rgba(255,255,255,0.08)'
                  }`,
                }}
              >
                {isDone ? <Check size={12} color="#4ade80" /> :
                 isFailed ? <AlertCircle size={12} color="#f87171" /> :
                 isActive ? <Loader size={12} color="#22d3ee" className="animate-spin" /> :
                 <span style={{ color: '#334155', fontSize: 10 }}>{idx + 1}</span>}
              </motion.div>
              {/* Label */}
              <div
                className="text-center font-mono whitespace-pre-line leading-tight"
                style={{
                  fontSize: 9,
                  color: isDone ? '#4ade80' : isActive ? '#22d3ee' : isFailed ? '#f87171' : '#334155',
                }}
              >
                {STAGE_LABELS[stage]}
              </div>
            </motion.div>

            {idx < PIPELINE_STAGES.length - 1 && (
              <div
                className="flex-1 h-px"
                style={{
                  background: isDone
                    ? 'linear-gradient(to right, rgba(74,222,128,0.5), rgba(74,222,128,0.1))'
                    : 'rgba(255,255,255,0.06)',
                  minWidth: 12,
                }}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Live message / Diagnostic */}
      {lastEvent && (
        <div
          className="ml-4 text-xs font-mono max-w-sm border-l border-cyan-900/40 pl-4 leading-tight"
          style={{ color: lastEvent.status === 'failed' ? '#f87171' : '#94a3b8' }}
        >
          {lastEvent.status === 'failed' && <span className="font-bold mr-1">DIAGNOSTIC:</span>}
          {lastEvent.message}
        </div>
      )}
    </div>
  );
};
