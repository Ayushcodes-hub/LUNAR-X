// useSSE — subscribes to SSE job stream, updates live progress, and retrieves full final results
import { useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useStore } from '../store';
import type { PipelineEvent } from '../types/api';

export function useSSE(jobId: string | null): void {
  const addEvent = useStore((s) => s.addEvent);
  const setLiveMetrics = useStore((s) => s.setLiveMetrics);
  const setJobStatus = useStore((s) => s.setJobStatus);
  const setResult = useStore((s) => s.setResult);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Close any existing stream
    esRef.current?.close();

    const fetchResult = async () => {
      // Poll a few times with backoff until background task commits to SQLite
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const res = await api.getJobResult(jobId);
          if (res && res.job_id) {
            setResult(res);
            if (res.metrics) {
              setLiveMetrics(res.metrics);
            }
            setJobStatus('done');
            return;
          }
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    };

    const es = api.streamJob(jobId);
    esRef.current = es;

    const handleEvent = (event: PipelineEvent) => {
      addEvent(event);
      if (event.metrics) {
        setLiveMetrics(event.metrics);
      }
      if (event.stage === 'complete' || event.progress_pct >= 100) {
        setJobStatus('done');
        es.close();
        void fetchResult();
      }
      if (event.status === 'failed') {
        setJobStatus('failed');
        es.close();
      }
    };

    es.onmessage = (e) => {
      try {
        const event: PipelineEvent = JSON.parse(e.data);
        handleEvent(event);
      } catch {
        console.warn('[LUNARIS] SSE parse error:', e.data);
      }
    };

    const STAGES = [
      'ingestion',
      'preprocessing',
      'feature_extraction',
      'feature_matching',
      'geometric_estimation',
      'subpixel_refinement',
      'evaluation',
      'complete',
    ];
    STAGES.forEach((stage) => {
      es.addEventListener(stage, (e: MessageEvent) => {
        try {
          const event: PipelineEvent = JSON.parse(e.data);
          handleEvent(event);
        } catch {
          /* ignore */
        }
      });
    });

    es.onerror = () => {
      // Stream ended normally (sentinel received) or connection closed
      es.close();
      void fetchResult();
    };

    return () => {
      es.close();
    };
  }, [jobId]);
}
