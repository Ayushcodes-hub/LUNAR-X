// HealthStatus — shows real service status from /api/health
// Shows CONFIGURATION REQUIRED for unimplemented integrations
// Never shows CONNECTED for services that aren't actually verified
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { api } from '../services/api';
import type { HealthService } from '../types/api';

const StatusIcon: React.FC<{ status: HealthService['status'] }> = ({ status }) => {
  switch (status) {
    case 'ready':
      return <CheckCircle size={12} color="#4ade80" />;
    case 'configuration_required':
      return <AlertCircle size={12} color="#fbbf24" />;
    case 'unavailable':
      return <XCircle size={12} color="#f87171" />;
  }
};

const STATUS_LABEL: Record<HealthService['status'], string> = {
  ready: 'READY',
  configuration_required: 'CONFIGURATION REQUIRED',
  unavailable: 'UNAVAILABLE',
};

const STATUS_COLOR: Record<HealthService['status'], string> = {
  ready: '#4ade80',
  configuration_required: '#fbbf24',
  unavailable: '#f87171',
};

export const HealthStatus: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="text-xs text-slate-600 font-mono">Checking services...</div>;
  if (isError || !data) return <div className="text-xs text-red-400 font-mono">Backend unreachable</div>;

  return (
    <div className="space-y-2">
      {data.services.map((svc) => (
        <div key={svc.name} className="flex items-start gap-2 py-2 border-b border-cyan-900/20 last:border-0">
          <StatusIcon status={svc.status} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono" style={{ color: STATUS_COLOR[svc.status] }}>
              {svc.name}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">{svc.detail}</div>
          </div>
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{
              fontSize: 9,
              color: STATUS_COLOR[svc.status],
              background: `${STATUS_COLOR[svc.status]}12`,
              border: `1px solid ${STATUS_COLOR[svc.status]}30`,
            }}
          >
            {STATUS_LABEL[svc.status]}
          </span>
        </div>
      ))}
      <div className="text-xs text-slate-600 font-mono pt-1">
        v{data.version} · {data.gpu_available ? `GPU: ${data.gpu_name}` : 'CPU mode'}
      </div>
    </div>
  );
};
