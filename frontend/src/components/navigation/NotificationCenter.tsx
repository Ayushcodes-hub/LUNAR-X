import React, { useState } from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useStore } from '../../store';

export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const events = useStore((s) => s.events);
  const clearEvents = useStore((s) => s.clearEvents);

  const notifications = events.slice(-15).reverse();
  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
        title="Mission Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 glass rounded-xl border border-cyan-900/40 shadow-2xl bg-[#0a0b14]/95 z-50 overflow-hidden font-mono">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-900/30">
            <span className="text-xs font-bold text-slate-200 tracking-wider">PIPELINE EVENT FEED</span>
            <div className="flex items-center gap-2">
              <button
                onClick={clearEvents}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                CLEAR
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2 space-y-1.5">
            {notifications.map((n, i) => {
              const isDone = n.status === 'done';
              const isFail = n.status === 'failed';
              return (
                <div
                  key={i}
                  className="p-2 rounded bg-black/40 border border-cyan-900/20 text-xs flex gap-2.5 items-start"
                >
                  {isDone ? (
                    <CheckCircle2 size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
                  ) : isFail ? (
                    <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info size={13} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {n.stage.replace('_', ' ')}
                    </div>
                    <div className="text-[11px] text-slate-300 leading-tight truncate mt-0.5">
                      {n.message}
                    </div>
                  </div>
                </div>
              );
            })}
            {notifications.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">No recent pipeline events</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
