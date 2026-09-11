import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface GraticuleOverlayProps {
  width: number;
  height: number;
  centerLat?: number;
  centerLon?: number;
}

export const GraticuleOverlay: React.FC<GraticuleOverlayProps> = ({
  width,
  height,
  centerLat = -70.92,
  centerLon = 22.84,
}) => {
  const { graticuleVisible } = useWorkspaceStore();

  if (!graticuleVisible || width <= 0 || height <= 0) return null;

  const nLines = 6;
  const stepX = width / nLines;
  const stepY = height / nLines;

  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full z-10 font-mono text-[9px] select-none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <pattern id="grid-pattern" width={stepX} height={stepY} patternUnits="userSpaceOnUse">
          <path
            d={`M ${stepX} 0 L 0 0 0 ${stepY}`}
            fill="none"
            stroke="rgba(34, 211, 238, 0.12)"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />
        </pattern>
      </defs>

      {/* Grid Pattern */}
      <rect width={width} height={height} fill="url(#grid-pattern)" />

      {/* Vertical Graticule Lines & Longitude Labels */}
      {Array.from({ length: nLines - 1 }).map((_, i) => {
        const x = stepX * (i + 1);
        const lon = centerLon + (i - Math.floor(nLines / 2)) * 0.05;
        return (
          <g key={`vert-${i}`}>
            <text
              x={x + 4}
              y={14}
              fill="rgba(34, 211, 238, 0.45)"
              textAnchor="start"
              className="tabular-nums"
            >
              {lon >= 0 ? `${lon.toFixed(2)}°E` : `${Math.abs(lon).toFixed(2)}°W`}
            </text>
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={6}
              stroke="rgba(34, 211, 238, 0.6)"
              strokeWidth="1"
            />
            <line
              x1={x}
              y1={height - 6}
              x2={x}
              y2={height}
              stroke="rgba(34, 211, 238, 0.6)"
              strokeWidth="1"
            />
          </g>
        );
      })}

      {/* Horizontal Graticule Lines & Latitude Labels */}
      {Array.from({ length: nLines - 1 }).map((_, i) => {
        const y = stepY * (i + 1);
        const lat = centerLat + (Math.floor(nLines / 2) - i) * 0.05;
        return (
          <g key={`horiz-${i}`}>
            <text
              x={8}
              y={y - 4}
              fill="rgba(34, 211, 238, 0.45)"
              textAnchor="start"
              className="tabular-nums"
            >
              {lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`}
            </text>
            <line
              x1={0}
              y1={y}
              x2={6}
              y2={y}
              stroke="rgba(34, 211, 238, 0.6)"
              strokeWidth="1"
            />
            <line
              x1={width - 6}
              y1={y}
              x2={width}
              y2={y}
              stroke="rgba(34, 211, 238, 0.6)"
              strokeWidth="1"
            />
          </g>
        );
      })}

      {/* Center Reticle Crosshair */}
      <g stroke="rgba(242, 179, 61, 0.6)" strokeWidth="1">
        <line x1={width / 2 - 12} y1={height / 2} x2={width / 2 + 12} y2={height / 2} />
        <line x1={width / 2} y1={height / 2 - 12} x2={width / 2} y2={height / 2 + 12} />
        <circle cx={width / 2} cy={height / 2} r="4" fill="none" />
      </g>
    </svg>
  );
};
