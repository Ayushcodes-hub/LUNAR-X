import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X, Trash2, Copy, Check, Filter } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useStore } from '../../store';

export const LogDrawer: React.FC = () => {
  const { isLogDrawerOpen, toggleLogDrawer } = useWorkspaceStore();
  const events = useStore((s) => s.events);
  const clearEvents = useStore((s) => s.clearEvents);

  const [copied, setCopied] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'running' | 'done' | 'failed'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (!isLogDrawerOpen) return null;

  const filteredEvents = events.filter((e) => {
    if (filterSeverity === 'all') return true;
    return e.status === filterSeverity;
  });

  const handleCopy = () => {
    const text = events
      .map(
        (e) =>
          `[${new Date(e.timestamp * 1000).toISOString()}] [${e.stage.toUpperCase()}] [${e.status.toUpperCase()}] ${e.message}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-52 bg-[#080a0f] border-t border-[#1c2230] flex flex-col font-mono text-xs z-30 select-text">
      {/* Console Header */}
      <div className="h-8 bg-[#0c0f16] border-b border-[#181e2b] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-cyan-400" />
          <span className="text-[11px] font-bold text-slate-300 tracking-wider">
            PIPELINE TELEMETRY STREAM & EVENT LOG
          </span>
          <span className="text-[10px] text-slate-500">
            ({events.length} records captured)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-[#10141e] border border-[#1d2332] px-1.5 py-0.5 rounded text-[10px]">
            <Filter size={10} className="text-slate-500" />
            <select
              aria-label="Filter events by severity"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="bg-transparent text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">ALL SEVERITY</option>
              <option value="running">RUNNING</option>
              <option value="done">DONE</option>
              <option value="failed">FAILED</option>
            </select>
          </div>

          {/* Copy Logs */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy logs to clipboard"
            className="p-1 hover:bg-[#182030] text-slate-400 hover:text-cyan-400 rounded transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>

          {/* Clear Logs */}
          <button
            type="button"
            onClick={clearEvents}
            title="Clear event stream"
            className="p-1 hover:bg-[#182030] text-slate-400 hover:text-red-400 rounded transition-colors"
          >
            <Trash2 size={12} />
          </button>

          <div className="w-[1px] h-3.5 bg-[#1c2230]" />

          {/* Close Console */}
          <button
            type="button"
            onClick={toggleLogDrawer}
            title="Close log console"
            className="p-1 hover:bg-[#182030] text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Log Output Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#06080c] font-mono text-[11px] leading-relaxed"
      >
        {filteredEvents.length === 0 ? (
          <div className="text-slate-600 italic">
            Console initialized. Waiting for pipeline execution events...
          </div>
        ) : (
          filteredEvents.map((evt, idx) => {
            const timeStr = new Date(evt.timestamp * 1000).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const statusColor =
              evt.status === 'done'
                ? 'text-emerald-400'
                : evt.status === 'failed'
                ? 'text-rose-400'
                : 'text-cyan-400';

            return (
              <div key={idx} className="flex items-start gap-2 hover:bg-[#0d111a] px-1 py-0.5 rounded">
                <span className="text-slate-600 shrink-0 tabular-nums">[{timeStr}]</span>
                <span className="text-slate-400 uppercase font-semibold shrink-0 w-28 truncate">
                  [{evt.stage}]
                </span>
                <span className={`uppercase font-bold shrink-0 w-16 text-[10px] ${statusColor}`}>
                  {evt.status}
                </span>
                <span className="text-slate-300 flex-1 break-all">{evt.message}</span>
                {evt.metrics && Object.keys(evt.metrics).length > 0 && (
                  <span className="text-slate-500 shrink-0 text-[10px] hidden lg:inline">
                    {JSON.stringify(evt.metrics).slice(0, 50)}…
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
